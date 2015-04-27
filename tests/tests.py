from unittest import TestCase
from documentparserator.webapp.app import sort_have_labels

class TestOrdering(TestCase):

    def test_one(self):
        self.assertEquals(sort_have_labels("Smith"), 1)

    def test_two(self):
        self.assertEquals(sort_have_labels("1112346-science-applications-international-corporation"), 0)

    def test_three(self):
        queue = ["Smith", "1112346-science-applications-international-corporation"]
        queue.sort(key=sort_have_labels)
        self.assertEquals(queue[0], "1112346-science-applications-international-corporation")

    def test_four(self):
        queue = ["1112346-science-applications-international-corporation", "Smith"]
        queue.sort(key=sort_have_labels)
        self.assertEquals(queue[0], "1112346-science-applications-international-corporation")