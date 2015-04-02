from flask import Flask
import logging
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


def get_queue(filename):
    queue = [q.replace("\n", "") for q in open(filename)]
    return queue


def sort_keys(keys):
    keys.sort(key = lambda x: int(x.split("-")[1]))
    keys.sort(key = lambda x: int(x.split("-")[0]))
    return keys


def prep_inputs(raw_sequence):
    sequence_labels = []
    for token in raw_sequence:
        sequence_labels.append((token[0], token[1]))
    return sequence_labels


@app.route("/tokens", methods=['POST'])
def js():
    json = request.json
    keys = sort_keys(json.keys())
    tagged_strings = set([])
    inputs = []
    for k in keys:
        val = (json[k]['text'], json[k]['value'])
        inputs.append(val)
    tagged_sequence = prep_inputs(inputs)
    tagged_strings.add(tuple(tagged_sequence))
    module = __import__("contract_parser")
    appendListToXMLfile(tagged_strings, module , "out.xml")
    o = queue.pop()
    return o


@app.route("/verify", methods=['get'])
def check():
    module = __import__("contract_parser")
    client = DocumentCloud()
    doc = client.documents.get("1699212-ochsner-clinic-foundation-ochsner-cea-to-provide")
    tokens = module.parse(doc.full_text)
    print tokens


if __name__ == "__main__":
    queue = get_queue("doc_cloud_ids.csv")
    app.run()