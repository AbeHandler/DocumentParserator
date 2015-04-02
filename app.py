from flask import Flask
import logging
from flask import render_template, request
from data_prep_utils import *
import xml.etree.ElementTree as ET

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG, filename="log/tagger.log")

LEVELS = { 'debug':logging.DEBUG,
            'info':logging.INFO,
            'warning':logging.WARNING,
            'error':logging.ERROR,
            'critical':logging.CRITICAL
            }


@app.route("/<string:docid>", methods=['GET'])
def contract(docid):
    return render_template('doc.html', docid=docid)


@app.route("/tokens", methods=['POST'])
def js():
    json = request.json
    keys = json.keys()
    keys.sort(key = lambda x: int(x.split("-")[1]))
    keys.sort(key = lambda x: int(x.split("-")[0]))
    tagged_strings = set([])
    inputs = []
    for k in keys:
        val = (json[k]['text'], json[k]['value'])
        inputs.append(val)
    tagged_sequence = naiveManualTag(inputs)
    tagged_strings.add(tuple(tagged_sequence))
    module = __import__("contract_parser")
    appendListToXMLfile(tagged_strings, module , "out.xml")





if __name__ == "__main__":
    app.run()