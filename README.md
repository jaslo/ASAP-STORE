ASAP-STORE
==========

ActiveScaler Acceleration Platform - Storage Module ( High Performance Cloud Storage REST API compatible with Amazon S3 ) . This module is designed to provide high performance Cloud storage capability that will work with complete ActiveScaler Real-time API solution.

## Documentation

* [Prerequisite to install ASAP-STORE] (#prerequisite)
* [Getting started] (#getting-started)
* [Configuration parameters in ASAP-STORE] (#configuring-activescaler)
* [Genrating default API and Secret keys for server] (#Access-secret-keys)
* [Compatible Amazon S3 Style REST APIs] (#supported-apis)
  * [Currently supported APIs] (#supported-partially-apis)
  * [Future APIs support Plan] (#supported-future-apis)
  * [Features in Pro Version] (#pro-future-apis)
  * [S3 compatible Library with ASAP-STORE] (#s3-library)
* [Full API Documentation] (http://activescaler.com/docs)

<a name="prerequisite"></a>

## Prerequisite to install ActiveScaler

* Preferred Linux based OS distribution with sudo privilage ( To use standard Ports ) or any other OS
* Please install Nodejs. If you are new to Node.JS, Please check installation details at following link: 
<a href="http://nodejs.org/download/"> How to install Node.JS</a>
* Install the Redis Server in the system
  * For ubuntu - apt-get install redis-server
  * For centOS - yum install redis-server
  * To install the Redis from source please check the link: <a href="http://redis.io/download"> Redis Installation from source </a>

<a name="getting-started"></a>

## Getting Started

You can install `ASAP-STORE` by cloning it from git and extract it. After extraction, you need to run the following command:

```
cd ASAP-STORE && npm install

This step will install all the necesary modules required to run the server.
Please edit confuration file for your environment. Configuration options are described in next section.
once the installation is completed, you can start the server in following ways:

* sudo node index.js ( Run the server as an instance )
* sudo pm2 start index.js  ( Run as background service )
* sudo forever start index.js  ( Run as background service )

Please note server is designed to support all CPU cores for maximum performance. To optimize performance on individual OS, please check tutorials in docs folder.

```

<a name="configuring-activescaler"></a>
## Configuration parameters in ActiveScaler 

You can edit configuration options of ASAP-STORE by editing configuration file (s3server/lib/config.js). Key configuration parameters are described below:

```

| --------------------|:---------------------------------------------------------------------------------------:|
| Paremeters          |                                     Description                                         |
| --------------------|:---------------------------------------------------------------------------------------:|
|                     |                                                                                         |
|config.server.Host   | Host address of the server, default 0.0.0.0                                             |
|config.server.Port   | Port of the server, default 80                                                          |
|config.WebServer.Port| Port on which Webserver will be running, It is used to get file from Web browser        |
|config.server.Name   | Name of the ActiveScaler server, default is Amazon S3                                   |
|config.redis.host    | IP of the server running redis, default 127.0.0.1                                       |
|config.redis.port    | Port of the server, default 6357                                                        |
|config.localzone     | Local Zone Name to define identity of local server. Default is 'loc-1'                  |
|config.fsDirArray    | Directories where uploaded files will be saved. Please see section Hashring             |
|config.isSecure      | true if using SSL server. We recommand to change config.server.Port to 443 if true      |
|config.SSLKey        | SSL key path in case using SSL trasport protocol                                        |
|config.SSLCert       | SSL Certification path in case using secure server                                      |
|config.Replica       | Number of copies you want to make of uploaded files. Recommanded vale is 3 for          |
|                     | high availability and 1 for optimal performance                                         |
|config.debug         | if debug true, server resource information will be shown in time of start               |
|config.maxuploadsize | Default 64 MB, configure according to your RAM size                                     |
|config.requesttimeout| timeout for a request on server                                                         |
|config.zoneslist     | Array, used for setting zonelist                                                        |
| --------------------|:---------------------------------------------------------------------------------------:|

```
In order to setup secure connection using HTTPS, you need to create SSL certificate and create PEM file. Please follow this tutorial or similer approcah to generate certificate and PEM files. We recommand to use 1024 bit or larger size rsa keys.

[Creating SSL keys, CSRs, self-signed certificates, and .pem files] (http://grahamc.com/blog/openssl-madness-how-to-create-keys-certificate-signing-requests-authorities-and-pem-files)

[OpenSSL Command-Line HOWTO] (http://www.madboa.com/geek/openssl/)

<a name="Access-secret-keys"></a>

## Populating default API and Secret keys for server

Goto setup diroctory. Run the command `node index` there. Now, you can access the user management of the ActiveScaler server using http://127.0.0.1:8080 . You can create, delete and list active keys information.

## Testing using s3curl Utility

s3curl is an utility provided by Amazon to validate Amazon S3 REST API capability. We are providing a copy of s3curl in test directory with minor enhancements. For original version please visit : <a href="http://aws.amazon.com/code/128">Amazon s3curl utility</a>

When you are using s3curl, you need to put `App key` and `Secret key` in .s3curl ( Please refer s3curl documentation ), and use local server address as follows:

perl s3curl.pl --id=personal --createBucket -- http://127.0.0.1/testBucket

<a name="supported-apis"></a>

### Most compatible API with Amazon S3

Right now, ActiveScaler supports most of the Amazon APIs, it is about to add support for many APIs in the future near by. The currently Supported features are as follows:

* [Bucket creation, listing, and deletion] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketOps.html)
* [Object upload, download and delete] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectOps.html)
* [Enabling versioning in bucket level and using versioning in object] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTVersioningStatus.html)
* [Multipart upload, download object, Listing multipart object] (http://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadInitiate.html)
* [Tagging in bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETtagging.html)

* Response content type

<a name="supported-partially-apis"></a>

### Partial implemented API with Amazon S3 compatibility 

* [ACL implementation in bucket and object level] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTacl.html)
* [Policy setup in bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTpolicy.html) 
* [Website features] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETwebsite.html)
* [Lifecycle management] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETlifecycle.html) (Setting Expiration in bucket) 
* [Location configuration in bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETlocation.html) 
* [Notification in Bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETnotification.html)
* [Bucket requestPayment] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTrequestPaymentPUT.html)

<a name="supported-future-apis"></a>

### Planned Future enhancements

* [Logging in Bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETlogging.html)
* [CORS in Bucket] (http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETcors.html)

<a name="pro-future-apis"></a>

### Features in Pro Version

* Complete Web provisioning tool
* Real-Time Monitoring Tool
* Billing Support
* Geo distributed cluster management

<a name="s3-library"></a>

### S3 compatible Library with ASAP-STORE
Most library and applicaitons are designed to work with ASAP-STORE solution and usually just need to change host name, key and secret only.

* [PHP library] (https://github.com/aws/aws-sdk-php)
* [JAVA library] (https://github.com/aws/aws-sdk-java)
* [JAVA eclips] (https://github.com/aws/aws-toolkit-eclipse)
* [.NET library] (https://github.com/aws/aws-sdk-net)
* [C Library API] (http://libs3.ischo.com.s3.amazonaws.com/index.html)
* [Ruby library] (https://github.com/aws/aws-sdk-ruby)
* [iOS SDK] (https://github.com/aws/aws-sdk-ios-v2)
* [Android SDK] (https://github.com/aws/aws-sdk-android-v2)
* [Python library] (https://github.com/boto/boto)
* [NodeJS library] (https://github.com/aws/aws-sdk-js)
* [Javascript library for Browser] (https://github.com/aws/aws-sdk-js)
