"""
This very simple Flask app allows you to tag tokens in a DocumentCloud document
"""
from flask import Flask
from flask import jsonify
import logging
import os
import importlib
import json
from documentparserator.utils import sort_keys
from flask import render_template, request
from documentparserator.data_prep_utils import appendListToXMLfile
from documentcloud import DocumentCloud
from documentparserator.utils import get_document_page
from documentparserator.settings import Settings

app = Flask(__name__)

SETTINGS = Settings()

logging.basicConfig(level=logging.DEBUG, filename=SETTINGS.LOG_LOCATION)

MODULE = importlib.import_module('documentparserator.parserator.contract_parser')

CLIENT = DocumentCloud()

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
    tagged_strings = set()
    labels = get_labels()
    tagged_sequence = labels # replacing prep_inputs method. still works?
    tagged_strings.add(tuple(tagged_sequence))
    module = __import__("contract_parser")  # import the parserator model
    try:
        os.remove("labels/" + docid + ".xml")
    except OSError:
        pass
    # send the XML to the file. accept a collection.
    appendListToXMLfile(tagged_strings,
                        module,
                        "labels/" + docid + ".xml")
    if len(queue) == 0:
        return "All done!"
    else:
        return queue.pop()



def get_blanks(doc_cloud_id):
    doc = CLIENT.documents.get(doc_cloud_id)
    pages = doc.pages
    blanks = []
    for page in range(1, pages):
        page_text = get_document_page(doc_cloud_id, page)
        page_tokens = MODULE.tokenize(page_text)
        counter = 1
        word = {}
        for token in page_tokens:
            word['count'] = counter
            word['word'] = token
            word['label'] = "skip"
            word['id'] = str(page) + "-" + str(counter)
            counter = counter + 1
            blanks.append(word)
    return blanks


@app.route("/tags/<string:docid>", methods=['post'])
def tags(docid):
    """
    The UI is requesting parserator's tags.
    If they've been processed, send them to client side
    Else, send a bunch of blank tags
    """
    filename = 'static/json/' + docid
    if not os.path.isfile(filename):
        blanks = get_blanks(docid)
        # to do
        # http://stackoverflow.com/questions/12435297/how-do-i-jsonify-a-list-in-flask
        return json.dumps(blanks) 
    with open(filename) as tokens_file:
        try:
            file_json = json.load(tokens_file)
            return json.dumps(file_json)
        except:
            return json.dumps(blanks)


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
