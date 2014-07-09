var xmljs = require('xml2js');
var defineClass = require("./defineClass.js").defineClass;

var Error_Class = defineClass({
    Ecode: '',
    Code : '',
    Message : '',
    RequestId: '',
    Resource: '',
    constructor: function (incode, inmsg, inrid, inres) {
          this.code = incode || '';
          this.Message = inmsg || '';
          this.RequestId = inrid || '';
          this.Resource = inres || '';
    },
    GetNumCode: function (){ return this.Ecode;},
    SetCode: function (incode) { this.code = incode; },
    SetMessage: function (inmsg) { this.Message = inmsg; },
    SetRequestId: function (inrid) { this.RequestId = inrid; },
    SetResource: function (inres) { this.Resource = inres; },
    GetError: function(){ 
          var errortext = [];
          var builder = new xmljs.Builder();
          errortext['code'] = this.code;
          if(this.Message)
              errortext['Message'] = this.Message;
          if(this.RequestId)
              errortext['RequestId'] = this.RequestId;
          if(this.Resource)
              errortext['Resource'] = this.Resource;
          return builder.buildObject({"Error": errortext});
    },
    GetErrorMsg: function(ecode){
        switch(ecode)
        {
// There are a lot of madeup code for different output for same code                
            case 301:
                this.Ecode = 301;
                this.SetCode('PermanentRedirect');
                this.SetMessage('The bucket you are attempting to access must be addressed using the specified endpoint. Please send all future requests to this endpoint. 301 Moved Permanently');
            break;
// This is for error 307
            case 307:
                this.Ecode = 307;
                this.SetCode('TemporaryRedirect');
                this.SetMessage('You are being redirected to the bucket while DNS updates. 307 Moved Temporarily');
            break;
            case 3071:
                this.Ecode = 307;
                this.SetCode('Redirect');
                this.SetMessage('Temporary redirect. 307 Moved Temporarily');
            break;
// This is for error 400
            case 400: 
                this.Ecode = 400;
                this.SetCode('CredentialsNotSupported');
                this.SetMessage("This request does not support credentials.  400 Bad Request");
            break;
            case 4001: 
                this.Ecode = 400;
                this.SetCode('EntityTooSmall');
                this.SetMessage("Your proposed upload is smaller than the minimum allowed object size.  400 Bad Request");
            break;
            case 4002: 
                this.Ecode = 400;
                this.SetCode('EntityTooLarge');
                this.SetMessage("Your proposed upload exceeds the maximum allowed object size. 400 Bad Request");
            break;
            case 4003: 
                this.Ecode = 400;
                this.SetCode('ExpiredToken');
                this.SetMessage("The provided token has expired. 400 Bad Request");
            break;
            case 4004: 
                this.Ecode = 400;
                this.SetCode('IllegalVersioningConfigurationException');
                this.SetMessage("Indicates that the Versioning configuration specified in the request is invalid. 400 Bad Request");
            break;
            case 4005: 
                this.Ecode = 400;
                this.SetCode('IncompleteBody');
                this.SetMessage("You did not provide the number of bytes specified by the Content-Length HTTP header 400 Bad Request");
            break;
            case 4006: 
                this.Ecode = 400;
                this.SetCode('IncorrectNumberOfFilesInPostRequest');
                this.SetMessage("POST requires exactly one file upload per request. 400 Bad Request");
            break;
            case 4007: 
                this.Ecode = 400;
                this.SetCode('InlineDataTooLarge');
                this.SetMessage("Inline data exceeds the maximum allowed size. 400 Bad Request");
            break;
            case 4008: 
                this.Ecode = 400;
                this.SetCode('InvalidArgument');
                this.SetMessage("InvalidArgument' 400 Bad Request");
            break;
            case 4009: 
                this.Ecode = 400;
                this.SetCode('InvalidBucketName');
                this.SetMessage("The specified bucket is not valid. 400 Bad Request");
            break;
            case 40010: 
                this.Ecode = 400;
                this.SetCode('InvalidDigest');
                this.SetMessage("The Content-MD5 you specified was an invalid.  400 Bad Request");
            break;
            case 40011: 
                this.Ecode = 400;
                this.SetCode('InvalidPartOrder');
                this.SetMessage("The list of parts was not in ascending order.Parts list must specified in order by part number. 400 Bad Request");
            break;
            case 40012: 
                this.Ecode = 400;
                this.SetCode('InvalidLocationConstraint');
                this.SetMessage("The specified location constraint is not valid. For more information about Regions, see How to Select a Region for Your Buckets. 400 Bad Request");
            break;
            case 40013: 
                this.Ecode = 400;
                this.SetCode('InvalidPolicyDocument');
                this.SetMessage("The content of the form does not meet the conditions specified in the policy document.  400 Bad Request");
            break;
            case 40014: 
                this.Ecode = 400;
                this.SetCode('InvalidRequest');
                this.SetMessage("SOAP requests must be made over an HTTPS connection. 400 Bad Request");
            break;
            case 40015: 
                this.Ecode = 400;
                this.SetCode('InvalidSOAPRequest');
                this.SetMessage("The SOAP request body is invalid. 400 Bad Request");
            break;
            case 40016: 
                this.Ecode = 400;
                this.SetCode('InvalidStorageClass');
                this.SetMessage("The storage class you specified is not valid. 400 Bad Request");
            break;
            case 40017: 
                this.Ecode = 400;
                this.SetCode('InvalidToken');
                this.SetMessage("The provided token is malformed or otherwise invalid. 400 Bad Request");
            break;
            case 40018: 
                this.Ecode = 400;
                this.SetCode('InvalidURI');
                this.SetMessage("Couldn't parse the specified URI. 400 Bad Request");
            break;
            case 40019: 
                this.Ecode = 400;
                this.SetCode('KeyTooLong');
                this.SetMessage("Your key is too long.  400 Bad Request");
            break;
            case 40020: 
                this.Ecode = 400;
                this.SetCode('MalformedACLError');
                this.SetMessage("The XML you provided was not well-formed or did not validate against our published schema. 400 Bad Request");
            break;
            case 40021: 
                this.Ecode = 400;
                this.SetCode('MalformedPOSTRequest');
                this.SetMessage("The body of your POST request is not well-formed multipart/form-data. 400 Bad Request");
            break;
            case 40022: 
                this.Ecode = 400;
                this.SetCode('MaxMessageLengthExceeded');
                this.SetMessage("Your request was too big. 400 Bad Request");
            break;
            case 40023:
                this.Ecode = 400;
                this.SetCode('MaxPostPreDataLengthExceededError');
                this.SetMessage("Your POST request fields preceding the upload file were too large. 400 Bad Request");
            break;
            case 40024: 
                this.Ecode = 400;
                this.SetCode('MetadataTooLarge');
                this.SetMessage("Your metadata headers exceed the maximum allowed metadata size. 400 Bad Request");
            break;
            case 40025: 
                this.Ecode = 400;
                this.SetCode('MissingRequestBodyError');
                this.SetMessage("This happens when the user sends an empty xml document as a request. The error message is, Request body is empty. 400 Bad Request");
            break;
            case 40026: 
                this.Ecode = 400;
                this.SetCode('MissingSecurityElement');
                this.SetMessage("The SOAP 1.1 request is missing a security element. 400 Bad Request");
            break;
             case 40027: 
                this.Ecode = 400;
                this.SetCode('MissingSecurityHeader');
                this.SetMessage("Your request was missing a required header. 400 Bad Request");
            break;
            case 40028: 
                this.Ecode = 400;
                this.SetCode('NoLoggingStatusForKey');
                this.SetMessage("There is no such thing as a logging status sub-resource for a key. 400 Bad Request");
            break;
            case 40029: 
                this.Ecode = 400;
                this.SetCode('RequestIsNotMultiPartContent');
                this.SetMessage("Bucket POST must be of the enclosure-type multipart/form-data. 400 Bad Request");
            break;
            case 40030: 
                this.Ecode = 400;
                this.SetCode('RequestTimeout');
                this.SetMessage("Your socket connection to the server was not read from or written to within the timeout period. 400 Bad Request");
            break;
            case 40031: 
                this.Ecode = 400;
                this.SetCode('RequestTorrentOfBucketError');
                this.SetMessage("Requesting the torrent file of a bucket is not permitted. 400 Bad Request");
            break;
            case 40032: 
                this.Ecode = 400;
                this.SetCode('TokenRefreshRequired');
                this.SetMessage("The provided token must be refreshed. 400 Bad Request");
            break;
            case 40033: 
                this.Ecode = 400;
                this.SetCode('TooManyBuckets');
                this.SetMessage("You have attempted to create more buckets than allowed. 400 Bad Request");
            break;
            case 40034: 
                this.Ecode = 400;
                this.SetCode('UnexpectedContent');
                this.SetMessage("This request does not support content. 400 Bad Request");
            break;
            case 40035: 
                this.Ecode = 400;
                this.SetCode('UnresolvableGrantByEmailAddress');
                this.SetMessage("The e-mail address you provided does not match any account on record. 400 Bad Request");
            break;
            case 40036: 
                this.Ecode = 400;
                this.SetCode('UserKeyMustBeSpecified');
                this.SetMessage("The bucket POST must contain the specified field name. If it is specified, please check the order of the fields.400 Bad Request");
            break;
            case 40037: 
                this.Ecode = 400;
                this.SetCode('InvalidTargetBucketForLogging');
                this.SetMessage("The target bucket for logging does not exist, is not owned by you, or does not have the appropriate grants for the log-delivery group. 400 Bad Request");
            break;
            case 40038: 
                this.Ecode = 400;
                this.SetCode('InvalidPart');
                this.SetMessage("One or more of the specified parts could not be found. The part might not have been uploaded, or the specified entity tag might not have matched the part's entity tag. 400 Bad Request");
            break;
            case 40039: 
                this.Ecode = 400;
                this.SetCode('MalformedXML');
                this.SetMessage("This happens when the user sends a malformed xml (xml that doesn't conform to the published xsd) for the configuration. The error message is, The XML you provided was not well-formed or did not validate against our published schema. 400 Bad Request");
            break;
// All different 403 erros
            case 403: 
                this.Ecode = 403;
                this.SetCode('AccessDenied');
                this.SetMessage("403 Access Denied");
            break;
            case 4031: 
                this.Ecode = 403;
                this.SetCode('AccountProblem');
                this.SetMessage("403 There is a problem with your AWS account that prevents the operation from completing successfully. Please use Contact Us.");
            break;
            case 4032: 
                this.Ecode = 403;
                this.SetCode('InvalidAccessKeyId');
                this.SetMessage("The AWS Access Key Id you provided does not exist in our records. 403 Forbidden");
            break;
            case 4033: 
                this.Ecode = 403;
                this.SetCode('InvalidObjectState');
                this.SetMessage("The operation is not valid for the current state of the object. 403 Forbidden");
            break;
            case 4034: 
                this.Ecode = 403;
                this.SetCode('InvalidPayer');
                this.SetMessage("All access to this object has been disabled. 403 Forbidden");
            break;
            case 4035:
                this.Ecode = 403;
                this.SetCode('InvalidSecurity');
                this.SetMessage("The provided security credentials are not valid.  403 Forbidden");
            break;
            case 4036: 
                this.Ecode = 403;
                this.SetCode('RequestTimeTooSkewed');
                this.SetMessage("The difference between the request time and the server's time is too large. 403 Forbidden");
            break;
            case 4037: 
                this.Ecode = 403;
                this.SetCode('CrossLocationLoggingProhibited');
                this.SetMessage("Cross location logging not allowed. Buckets in one geographic location cannot log information to a bucket in another location. 403 Forbidden");
            break;
            case 4038: 
                this.Ecode = 403;
                this.SetCode('NotSignedUp');
                this.SetMessage("Your account is not signed up for the Amazon S3 service.You must sign up before you can use Amazon S3. You can sign up at the following URL: http://aws.amazon.com/s3 403 Forbidden");
            break;
            case 4039: 
                this.Ecode = 403;
                this.SetCode('SignatureDoesNotMatch');
                this.SetMessage("The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. For more information, see REST Authentication and SOAP Authentication for details. 403 Forbidden");
            break;
// This 404 
            case 404: 
                this.Ecode = 404;
                this.SetCode('NoSuchKey');
                this.SetMessage('The specified key does not exist. 404 Not Found');
            break;
            case 4041:
                this.Ecode = 404;
                this.SetCode('NoSuchBucket');
                this.SetMessage('The specified bucket does not exist. 404 Not Found');
            break;
            case 4042:
                this.Ecode = 404;
                this.SetCode('NoSuchLifecycleConfiguration');
                this.SetMessage('The lifecycle configuration does not exist. 404 Not Found');
            break;
            case 4043:
                this.Ecode = 404;
                this.SetCode('NoSuchVersion');
                this.SetMessage('Indicates that the version ID specified in the request does not match an existing version. 404 Not Found');
            break;
            case 4044:
                this.Ecode = 404;
                this.SetCode('NotSuchBucketPolicy');
                this.SetMessage('The specified bucket does not have a bucket policy. 404 Not Found');
            break;
            case 4045:
                this.Ecode = 404;
                this.SetCode('NoSuchUpload');
                this.SetMessage('The specified multipart upload does not exist. The upload ID might be invalid, or the multipart upload might have been aborted or completed. 404 Not Found');
            break;
            case 4046:
                this.Ecode = 404;
                this.SetCode('TooManyUploadPart');
                this.SetMessage('Maximum number of allowed upload part numbers are 999. 404 Not Found');
            break;
// This is error 405
            case 405: 
                this.Ecode = 405;
                this.SetCode('MethodNotAllowed');
                this.SetMessage('The specified method is not allowed against this resource. 405 Method Not Allowed');
            break;

// This is error 409
            case 409: 
                this.Ecode = 409;
                this.SetCode('InvalidBucketState');
                this.SetMessage('The request is not valid with the current state of the bucket.  409 Conflict');
            break;
            case 4091: 
                this.Ecode = 409;
                this.SetCode('OperationAborted');
                this.SetMessage('A conflicting conditional operation is currently in progress against this resource. Please try again. 409 Conflict');
            break;
            case 4092: 
                this.Ecode = 409;
                this.SetCode('RestoreAlreadyInProgress');
                this.SetMessage('Object restore is already in progress. 409 Conflict');
            break;
            case 4093: 
                this.Ecode = 409;
                this.SetCode('BucketAlreadyOwnedByYou');
                this.SetMessage('Your previous request to create the named bucket succeeded and you already own it.  409 Conflict');
            break;
            case 4094: 
                this.Ecode = 409;
                this.SetCode('BucketNotEmpty');
                this.SetMessage('The bucket you tried to delete is not empty.  409 Conflict');
            break;
            case 4095: 
                this.Ecode = 409;
                this.SetCode('BucketAlreadyExists');
                this.SetMessage('The requested bucket name is not available. The bucket namespace is shared by all users of the system. Please select a different name and try again. 409 Conflict');
            break;
            case 4096: 
                this.Ecode = 410;
                this.SetCode('InformationNotAvailable');
                this.SetMessage('The requested information is not in valid state');
            break;

// This is error 411
            case 411: 
                this.Ecode = 411;
                this.SetCode('MissingContentLength');
                this.SetMessage('You must provide the Content-Length HTTP header. 411 Length Required');
            break;
            case 412: 
                this.Ecode = 412;
                this.SetCode('PreconditionFailed');
                this.SetMessage('At least one of the preconditions you specified did not hold. 412 Precondition Failed');
            break;
            case 416: 
                this.Ecode = 416;
                this.SetCode('InvalidRange');
                this.SetMessage('The requested range cannot be satisfied. 416 Requested Range Not Satisfiable');
            break;
            case 500:
                this.Ecode = 500;
                this.SetCode('InternalError');
                this.SetMessage('We encountered an internal error. Please try again. 500 Internal Server Error');
            break;
            case 501:
                this.Ecode = 501;
                this.SetCode('NotImplemented');
                this.SetMessage('A header you provided implies functionality that is not implemented. 501 Not Implemented');
            break;
            case 503:
                this.Ecode = 503;
                this.SetCode('ServiceUnavailable');
                this.SetMessage('Please reduce your request rate. 503 Service Unavailable Server SlowDown Please reduce your request rate. 503 Slow Down Server');
            break;
            case 601:
                this.Ecode = 601;
                this.SetCode('RedisError');
                this.SetMessage('Redis did not get/post data correctly!');
            break;
            default:
                 this.Ecode = 500;
                 this.SetCode('InternalError');
                 this.SetMessage(error.message);
            break;
        }
    }
});
module.exports.Error_Class = Error_Class;