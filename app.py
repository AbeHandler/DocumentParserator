from flask import Flask, jsonify
import logging
import os
import glob
import json
from flask import render_template, request
from data_prep_utils import appendListToXMLfile
import xml.etree.ElementTree as ET
from documentcloud import DocumentCloud

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG, filename="log/tagger.log")

LEVELS = { 'debug':logging.DEBUG,
            'info':logging.INFO,
            'warning':logging.WARNING,
            'error':logging.ERROR,
            'critical':logging.CRITICAL
            }



@app.route("/", methods=['GET'])
def main():
    return render_template('doc.html', docid=queue.pop())


@app.route("/<string:docid>", methods=['GET'])
def contract(docid):
    return render_template('doc.html', docid=docid)


def get_queue(filename, skiplist = None):
    queue = set([q.replace("\n", "") for q in open(filename)])
    if skiplist:
        skiplist = set([q.replace("\n", "") for q in open(skiplist)])
        queue = queue - skiplist
    return list(queue)


def sort_keys(keys):
    keys.sort(key = lambda x: int(x.split("-")[1]))
    keys.sort(key = lambda x: int(x.split("-")[0]))
    return keys


def prep_inputs(raw_sequence):
    sequence_labels = []
    for token in raw_sequence:
        sequence_labels.append((token[0], token[1]))
    return sequence_labels


@app.route("/tokens/<string:docid>", methods=['POST'])
def js(docid):
    """
    The UI is sending tagged tokens back to the server. Save them to train parserator
    """
    json = request.json  #get the json from the server
    keys = sort_keys(json.keys())  #sort the keys (i.e. the token ids)
    tagged_strings = set([])  
    inputs = []
    for k in keys:
        val = (json[k]['text'], json[k]['value'])   #get the labels that the user input to the UI
        inputs.append(val)
    tagged_sequence = prep_inputs(inputs)
    tagged_strings.add(tuple(tagged_sequence))
    module = __import__("contract_parser")       #import the parserator model
    try:
        os.remove("labels/" + docid + ".xml")
    except OSError:
        pass
    appendListToXMLfile(tagged_strings, module , "labels/" + docid + ".xml")  #send the XML to the file
    o = queue.pop()                              #get a new contract id to display on the UI
    return o


@app.route("/tags/<string:docid>", methods=['post'])  
def tags(docid):
    """
    The UI is requesting parserator's tags. Send them back to the server.
    """
    filename = 'static/json/' + docid
    if not os.path.isfile(filename):
        return ""
    with open(filename) as f:
        file_json = json.load(f)
        return json.dumps(file_json)


def filter_queue(queue, location):
    already_labeled = [i.replace("\n", "").replace(".xml", "") for i in glob.glob(location + "/*")]
    to_label = list(set(queue)-set(already_labeled))
    return to_label



if __name__ == "__main__":
    queue = get_queue("doc_cloud_ids.csv", 'skip_list.txt')[0:100]
    filter_queue(queue, "labels")
    app.run()