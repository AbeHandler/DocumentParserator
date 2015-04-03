from documentcloud import DocumentCloud
from app import sort_keys
import json

module = __import__("contract_parser")
client = DocumentCloud()


doc_cloud_id = "1699212-ochsner-clinic-foundation-ochsner-cea-to-provide"


def tokenize(doc_cloud_id):
    """
    Breaks a document into tokens based on the module's tokenizer
    """
    ids = {}
    doc = client.documents.get(doc_cloud_id)
    pages = doc.pages
    for x in range(1, pages + 1):
        counter = 0
        tokens = module.tokenize(doc.get_page_text(x))
        for t in tokens:
            tokenid = str(x) + "-" + str(counter)
            counter += 1
            ids[tokenid] = t
    return ids


def parse(doc_cloud_id):
    doc = client.documents.get(doc_cloud_id)
    full_text = doc.full_text
    return module.parse()


def pre_process(doc_cloud_id):
    output = {}
    tokens = tokenize(doc_cloud_id)
    tags = module.parse(client.documents.get(doc_cloud_id).full_text)
    token_ids = sort_keys(tokens.keys())
    for number in range(0, len(tags)):
        token = {}
        token['word'] = tags[number][0]
        token['label'] = tags[number][1]
        output[token_ids[number]] = token
    return output

parsed = pre_process(doc_cloud_id)

with open("static/json/" + doc_cloud_id, "w") as f:
    f.write(json.dumps(parsed))