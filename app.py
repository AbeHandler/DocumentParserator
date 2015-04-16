"""
This very simple Flask app allows you to tag tokens in a DocumentCloud document
"""
from flask import Flask
import logging
import os
import json
from flask import render_template, request
from data_prep_utils import appendListToXMLfile
from documentcloud import DocumentCloud

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG, filename="log/tagger.log")

LEVELS = {'debug': logging.DEBUG,
          'info': logging.INFO,
          'warning': logging.WARNING,
          'error': logging.ERROR,
          'critical': logging.CRITICAL}


@app.route("/", methods=['GET'])
def main():
    """
    Present the first document in the queue for labeling
    """
    return render_template('doc.html', docid=queue.pop())


@app.route("/<string:docid>", methods=['GET'])
def contract(docid):
    """
    Present a particular document for labeling
    """
    return render_template('doc.html', docid=docid)


def get_queue(filename):
    """
    Build a queue of docs to be labeled
    Exclude those doc_cloud_ids that have already been labeled
    """
    queue = [q.replace("\n", "") for q in open(filename)]
    queue = [l for l in queue if not os.path.exists("labels/" + l + ".xml")]
    queue = list(set(queue))  # dedupe
    return queue


def sort_keys(keys):
    """
    Keys come in the form page#-tokennumber (on a page)
    Sort them in order of pages, then in order of token #
    """
    keys.sort(key=lambda x: int(x.split("-")[1]))
    keys.sort(key=lambda x: int(x.split("-")[0]))
    return keys


def prep_inputs(raw_sequence):
    sequence_labels = []
    for token in raw_sequence:
        sequence_labels.append((token[0], token[1]))
    return sequence_labels


def get_labels():
    """
    Labeled tokens come back from the UI as JSON.
    This method pulls them from the json and dumps
    them out as tuples: (text, value) ex ("1.2 Million", contract_amount)
    """
    json_request = request.json  # get the json from the server
    keys = sort_keys(json_request.keys())  # sort the keys (i.e. the token ids)
    labels = []
    for k in keys:
        # get the labels that the user input to the UI
        val = (json_request[k]['text'], json_request[k]['value'])
        labels.append(val)
    return labels


@app.route("/tokens/<string:docid>", methods=['POST'])
def tokens_dump(docid):
    """
    The UI is sending tagged tokens back to the server.
    Save them to train parserator
    """
    tagged_strings = set([])
    labels = get_labels()
    tagged_sequence = labels # replacing prep_inputs method. still works?
    tagged_strings.add(tuple(tagged_sequence))
    module = __import__("contract_parser")  # import the parserator model
    try:
        os.remove("labels/" + docid + ".xml")
    except OSError:
        pass
    # send the XML to the file
    appendListToXMLfile(tagged_strings,
                        module,
                        "labels/" + docid + ".xml")
    if len(queue) == 0:
        return "All done!"
    else:
        return queue.pop()


@app.route("/tags/<string:docid>", methods=['post'])
def tags(docid):
    """
    The UI is requesting parserator's tags. Send them back to the server.
    """
    filename = 'static/json/' + docid
    if not os.path.isfile(filename):
        return ""
    with open(filename) as tokens_file:
        file_json = json.load(tokens_file)
        return json.dumps(file_json)


# TO DO DOES THIS METHOD WORK RIGHT? TESTS.

def sort_have_labels(doc_cloud_id):
    """
    A custom sort. Favors cases where there are
    already labels for the tokens from parserator.
    For big corpuses, parsing takes time so you don't want
    to parse the whole corpus just to see how it is doing
    """
    filename = "static/json/" + doc_cloud_id
    if os.path.isfile(filename):
        return 1
    return 0


if __name__ == "__main__":
    queue = get_queue("doc_cloud_ids.csv")
    queue.sort(key=sort_have_labels)  # sort fa
    app.run()
