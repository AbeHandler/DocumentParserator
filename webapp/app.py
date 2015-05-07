"""
This very simple Flask app allows you to tag tokens in a DocumentCloud document
"""
from flask import Flask
import logging
import os
import importlib
import json
from documentparserator.utils import spanify
from documentparserator.utils import sort_keys
from flask import render_template, request
from documentcloud import DocumentCloud
from documentparserator.utils import get_document_page
from documentparserator.settings import Settings
from parserator.data_prep_utils import appendListToXMLfile

SETTINGS = Settings()
MODULE = importlib.import_module(SETTINGS.MODULELOCATION)

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG, filename=SETTINGS.LOG_LOCATION)

CLIENT = DocumentCloud()

@app.route("/", methods=['GET'])
def main():
    """
    Present the first document in the queue for labeling
    """
    return render_template('doc.html', docid=queue.pop(0))


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
    build_queue = [q.replace("\n", "") for q in open(filename)]
    build_queue = [l for l in build_queue\
              if not os.path.exists(SETTINGS.XML_LOCATION + l + ".xml")]
    build_queue = list(set(build_queue))  # dedupe
    build_queue.sort(key=sort_have_labels)
    return build_queue


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


@app.route("/tags/<string:docid>", methods=['post'])
def tags(docid):
    """
    The UI is requesting parserator's tags.
    If they've been processed, send them to client side
    Else, send a bunch of blank tags
    """
    page = request.args.get('page')
    filename = SETTINGS.LABELED_LOCATION + '/' + docid
    page_text = get_document_page(docid, page)
    if not os.path.isfile(filename):
        return spanify(page_text, page)
    else:
        with open(filename) as tokens_file:
            labels = json.load(tokens_file)
            return spanify(page_text, page, labels)


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
    outfile = SETTINGS.XML_LOCATION + "/" + docid + ".xml"
    try:
        os.remove(outfile)
    except OSError:
        pass
    appendListToXMLfile(tagged_strings,
                        MODULE,
                        outfile)
    if len(queue) == 0:
        return "All done!"
    else:
        return queue.pop(0)


def sort_have_labels(doc_cloud_id):
    """
    A custom sort. Favors cases where there are
    already labels for the tokens from parserator.
    For big corpuses, parsing takes time so you don't want
    to parse the whole corpus just to see how it is doing
    """
    filename = SETTINGS.LABELED_LOCATION + "/" + doc_cloud_id
    if os.path.isfile(filename):
        return 0
    return 1


if __name__ == "__main__":
    queue = get_queue(SETTINGS.DOC_CLOUD_IDS)
    app.run()
