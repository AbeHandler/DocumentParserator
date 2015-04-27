import ConfigParser


class Settings():

    def get_from_config(self, field):
        config = ConfigParser.RawConfigParser()
        config.read(self.CONFIG_LOCATION)
        return config.get('Section1', field)

    def __init__(self):
        self.CONFIG_LOCATION = "config.cfg"
        self.LOG_LOCATION = self.get_from_config("log_location")
        self.LABELED_LOCATION = self.get_from_config("labeled_location")
        self.DOC_CLOUD_IDS = self.get_from_config('doc_cloud_ids')
        self.TAGS_LOCATION = self.get_from_config('tags_location')
        self.XML_LOCATION = self.get_from_config('xml_location')
        self.MODULELOCATION = self.get_from_config('module_location')
