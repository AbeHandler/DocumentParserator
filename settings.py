import ConfigParser


class Settings():

    def get_from_config(self, field):
        config = ConfigParser.RawConfigParser()
        config.read(self.CONFIG_LOCATION)
        return config.get('Section1', field)

    def __init__(self):
        self.CONFIG_LOCATION = "config.cfg"
        self.LOG_LOCATION = self.get_from_config("log_location")