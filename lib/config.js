var config = {};

config.redis = {};
config.server = {};
config.WebServer = {};
config.zoneslist = [];

config.server.Host = "127.0.0.1";
// For HTTP operation default port can be 80 and 8080, For SSL please make sure to make isSecure = true and use recommanded port numbers 443 and 4343
config.server.Port = process.env.ASSERVER_PORT || 80;
config.WebServer.Port = process.env.ASSERVER_PORT || 8080;
config.server.Name = "AmazonS3";

// Please make sure Redis  server is up and running
config.redis.uri = process.env.DUOSTACK_DB_REDIS;
config.redis.host = '127.0.0.1';
config.redis.port = 6379;

// Need to define at least one directory.
// Ideally you should have a clean disk, format it with XFS, mount in /mnt/ folder add into in the list. Just use JBOD
config.fsDirArray = [
   '/mnt/asdisk1/'
  ,'/mnt/asdisk2/'
  ,'/mnt/asdisk3/'
  ,'/mnt/asdisk4/'
  ];

// Is SSL Enable
config.isSecure   = false; 
// If isSecrure = true please define KEY and CERTIFICATE path
config.SSLKey = "/var/ssl/key.pem";
config.SSLCert = "/var/ssl/cert.pem";

// Number of Replica of Object
config.Replica   = 1; 

config.debug  = false;
// Default is 64MB and recommanded value is 32MB. Please configure according to your RAM availability.
config.maxuploadsize = 67108864; 
// Time in milisecond. While uploading request can take significantly large time so adjust accroding to your requirment
config.requesttimeout = 600000;
config.comapanyName = "ActiveScaler";

// List of all the installation and location value
config.zoneslist = [
    {"zoneCode": 'loc-us-1',   "zoneName":"US West Coast"},
    {"zoneCode": 'loc-us-2',   "zoneName":"US Eest Coast"},
    {"zoneCode": 'loc-eu-1',   "zoneName":"Europe West"}
];

// Current Installation location. It should be one of the value defined in zonelist
config.localzone = "loc-us-1";

module.exports = config;
