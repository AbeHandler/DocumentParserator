import json
import sys
from documentcloud import DocumentCloud
from documentparserator.utils import sort_keys
from documentparserator.settings import Settings

settings = Settings()
module = __import__(settings.MODULELOCATION)
client = DocumentCloud()


def tokenize(doc_cloud_id):
    """
    Breaks a document into tokens based on the module's tokenizer
    """
    ids = {}
    doc = client.documents.get(doc_cloud_id)
    pages = doc.pages
    for page in range(1, pages + 1):
        counter = 0
        tokens = module.tokenize(doc.get_page_text(page))
        for t in tokens:
            tokenid = str(page) + "-" + str(counter)
            counter += 1
            output = {}
            output['page'] = page
            output['word'] = t
            output['count'] = counter
            ids[tokenid] = output
    return ids


def parse(doc_cloud_id):
    doc = client.documents.get(doc_cloud_id)
    full_text = doc.full_text
    return module.parse()


def pre_process(doc_cloud_id):
    tokens = tokenize(doc_cloud_id)
    tags = module.parse(client.documents.get(doc_cloud_id).full_text)
    token_ids = sort_keys(tokens.keys())
    out = []
    for number in range(0, len(tags)):
        tag = tags[number]
        token = tokens[token_ids[number]]
        token['label'] = tag[1]  #add the tag label to the token
        token['id'] = token_ids[number]
        assert token['word'] == tag[0]
        out.append(token)
    return out

doc_cloud_id = sys.argv[1].replace("/backups/contracts", "").replace("_text.txt", "")

print doc_cloud_id

try:
    parsed = pre_process(doc_cloud_id)
    with open(settings.LABELED_LOCATION + "/" + doc_cloud_id, "w") as f:
        f.write(json.dumps(parsed))
except:
    pass