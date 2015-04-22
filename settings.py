<<<<<<< HEAD
import ConfigParser

class Settings():

    def __init__(self):
    	self.CONFIG_LOCATION = "documentparserator.cfg"
=======
#!/usr/bin/python
"""
Holds the settings so that they are accessible to other classes.
"""
import ConfigParser


class Settings():

    def __init__(self):
        self.CONFIG_LOCATION = "config.cfg"
>>>>>>> c68be111a72c57f4a7b3ca7b5ea3e17c0a7810e6

    def get_from_config(self, field):
        config = ConfigParser.RawConfigParser()
        config.read(self.CONFIG_LOCATION)
<<<<<<< HEAD
        return config.get('Section1', field)
=======
        return config.get('Section1', field)
>>>>>>> c68be111a72c57f4a7b3ca7b5ea3e17c0a7810e6
