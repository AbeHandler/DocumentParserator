import ConfigParser

class Settings():

    def __init__(self):
    	self.CONFIG_LOCATION = "documentparserator.cfg"

    def get_from_config(self, field):
        config = ConfigParser.RawConfigParser()
        config.read(self.CONFIG_LOCATION)
        return config.get('Section1', field)