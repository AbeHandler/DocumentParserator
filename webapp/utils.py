from documentcloud import DocumentCloud
import json
import sys
import importlib

module = importlib.import_module('documentparserator.contract_parser')

client = DocumentCloud()


def sort_keys(keys):
    """
    Keys come in the form page#-tokennumber (on a page)
    Sort them in order of pages, then in order of token #
    """
    keys.sort(key=lambda x: int(x.split("-")[1]))
    keys.sort(key=lambda x: int(x.split("-")[0]))
    return keys
  

def get_document_page(doc_cloud_id, page):
    """
    Get a page in a document cloud document
    """
    doc = client.documents.get(doc_cloud_id)
    return doc.get_page_text(page)


def get_labeled_tokens(doc_cloud_id, page):
    """
    Take a page of document cloud and return labeled tokens
    """
    page_text = get_document_page(doc_cloud_id, page_text)
    page_tokens =  module.tokenize(page_text)
    ids = {}
    counter = 1
    for t in tokens:
        tokenid = str(page) + "-" + str(counter)
        counter += 1
        output = {}
        output['page'] = page
        output['word'] = t
        output['count'] = counter
        ids[tokenid] = output
    return ids


def tokenize(doc_cloud_id):
    doc = client.documents.get(doc_cloud_id)
    total_pages = doc.pages
    all_tokens = {}
    for page in range(1, total_pages):
        page_tokens = get_labeled_tokens(doc_cloud_id, page)
        all_tokens = {key: value for (key, value) in (all_tokens.items() + page_tokens.items())}
    return all_tokens


def pre_process(doc_cloud_id):
    tokens = tokenize(doc_cloud_id)
    tags = module.parse(client.documents.get(doc_cloud_id).full_text)
    token_ids = sort_keys(tokens.keys())
    out = []
    for number in range(0, len(tags)):
        tag = tags[number]
        token = tokens[token_ids[number]]
        token['label'] = tag[1]  # add the tag label to the token
        token['id'] = token_ids[number]
        assert token['word'] == tag[0]
        out.append(token)
    return out
