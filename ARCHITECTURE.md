# Architecture Documentation

## System Architecture Overview

This document provides detailed technical specifications for the Claims Image Labeler serverless architecture on AWS.

## Architecture Diagram

![AWS Architecture](aws-architecture-diagram.png)

The diagram illustrates the complete data flow from user interaction through AI analysis and back to the frontend.

## Component Details

### 1. Frontend Layer (AWS Amplify)

**Technology**: React 18+ with Vite build tool

**Hosting**: AWS Amplify Hosting
- Automatic HTTPS
- Global CDN distribution
- Continuous deployment from Git
- Custom domain support

**Environment Variables**:
```bash
VITE_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com
```

**Key Features**:
- File input for image upload
- Progress indicators during upload and analysis
- Results display with verdict, confidence, and hints
- Error handling and user feedback

### 2. API Gateway (HTTP API)

**Type**: Amazon API Gateway HTTP API (cheaper and simpler than REST API)

**Endpoints**:

| Method | Path | Lambda Function | Description |
|--------|------|-----------------|-------------|
| POST | /presign | generatePresignedUrl | Generate S3 upload URL |
| POST | /analyze | analyzeImage | Analyze uploaded image |
| OPTIONS | /* | - | CORS preflight |

**Configuration**:
```yaml
CORS:
  AllowOrigins:
    - https://<amplify-domain>.amplifyapp.com
  AllowMethods:
    - POST
    - OPTIONS
  AllowHeaders:
    - Content-Type
  ExposeHeaders:
    - Content-Length
  MaxAge: 300
```

**Request Validation**:
- Content-Type validation
- JSON schema validation for request bodies
- Size limits on payloads

### 3. Lambda Functions

#### 3.1 generatePresignedUrl Lambda

**Runtime**: Python 3.11+  
**Memory**: 256 MB  
**Timeout**: 10 seconds  
**Concurrent Executions**: 100 (adjustable)

**Responsibilities**:
1. Generate unique file key with timestamp/UUID
2. Create presigned PUT URL for S3 (expires in 15 minutes)
3. Validate file type (images only)
4. Return upload credentials to client

**IAM Permissions**:
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject"],
  "Resource": "arn:aws:s3:::<bucket>/uploads/*"
}
```

**Code Structure**:
```python
import boto3
import json
import uuid
from datetime import datetime

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    # Parse request
    body = json.loads(event['body'])
    file_name = body['fileName']
    file_type = body['fileType']
    
    # Validate file type
    if not file_type.startswith('image/'):
        return error_response(400, 'Invalid file type')
    
    # Generate unique key
    key = f"uploads/{uuid.uuid4()}-{file_name}"
    
    # Generate presigned URL
    url = s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': BUCKET_NAME,
            'Key': key,
            'ContentType': file_type
        },
        ExpiresIn=900  # 15 minutes
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'url': url,
            'key': key,
            'bucket': BUCKET_NAME
        })
    }
```

#### 3.2 analyzeImage Lambda

**Runtime**: Python 3.11+  
**Memory**: 1024 MB (higher for image processing)  
**Timeout**: 60 seconds  
**Concurrent Executions**: 50 (adjustable)

**Responsibilities**:
1. Retrieve image from S3
2. Send image to Amazon Bedrock with fraud detection prompt
3. Parse AI response
4. Log analysis results
5. Emit CloudWatch metrics
6. Return structured verdict

**IAM Permissions**:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::<bucket>/uploads/*"
},
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
},
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:*:*:*"
},
{
  "Effect": "Allow",
  "Action": [
    "cloudwatch:PutMetricData"
  ],
  "Resource": "*"
}
```

**Code Structure**:
```python
import boto3
import json
import base64
from datetime import datetime

s3_client = boto3.client('s3')
bedrock_client = boto3.client('bedrock-runtime')
cloudwatch = boto3.client('cloudwatch')

def lambda_handler(event, context):
    start_time = datetime.now()
    
    # Parse request
    body = json.loads(event['body'])
    bucket = body['bucket']
    key = body['key']
    
    # Get image from S3
    response = s3_client.get_object(Bucket=bucket, Key=key)
    image_bytes = response['Body'].read()
    
    # Prepare Bedrock request
    prompt = """You are a claims fraud screener. Analyze this image and determine if it appears to be AI-generated or digitally manipulated.

Return your analysis as JSON with these fields:
- verdict: One of "AI_GENERATED", "LIKELY_REAL", or "INCONCLUSIVE"
- confidence: A number between 0 and 1 indicating your confidence
- hints: An array of 3-6 short observations explaining your decision

Focus on: lighting inconsistencies, texture repetition, edge artifacts, unnatural reflections, depth of field anomalies, and other AI generation artifacts."""

    # Call Bedrock Converse API
    response = bedrock_client.converse(
        modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "png",  # or detect from content-type
                            "source": {
                                "bytes": image_bytes
                            }
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    )
    
    # Parse response
    ai_response = response['output']['message']['content'][0]['text']
    analysis = json.loads(ai_response)
    
    # Calculate latency
    latency_ms = (datetime.now() - start_time).total_seconds() * 1000
    
    # Log structured data
    print(json.dumps({
        'requestId': context.request_id,
        'bucket': bucket,
        'key': key,
        'model': 'claude-3-5-sonnet',
        'latency': latency_ms,
        'verdict': analysis['verdict'],
        'confidence': analysis['confidence']
    }))
    
    # Emit CloudWatch metrics
    cloudwatch.put_metric_data(
        Namespace='ClaimsImageLabeler',
        MetricData=[
            {
                'MetricName': 'Verdict',
                'Value': 1,
                'Dimensions': [
                    {'Name': 'VerdictType', 'Value': analysis['verdict']}
                ]
            },
            {
                'MetricName': 'Confidence',
                'Value': analysis['confidence'],
                'Dimensions': [
                    {'Name': 'Verdict', 'Value': analysis['verdict']}
                ]
            },
            {
                'MetricName': 'Latency',
                'Value': latency_ms,
                'Unit': 'Milliseconds'
            }
        ]
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps(analysis)
    }
```

### 4. Amazon S3 Storage

**Bucket Configuration**:
```yaml
BucketName: claims-images-<account-id>-<region>
Versioning: Disabled (not required for this use case)
Encryption: SSE-S3 (AES-256)
PublicAccessBlock:
  BlockPublicAcls: true
  IgnorePublicAcls: true
  BlockPublicPolicy: true
  RestrictPublicBuckets: true
LifecycleRules:
  - Id: DeleteOldUploads
    Status: Enabled
    Prefix: uploads/
    ExpirationInDays: 30  # Auto-delete after 30 days
```

**CORS Configuration**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>https://<amplify-domain>.amplifyapp.com</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>Content-Type</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

**Object Key Structure**:
```
uploads/
  ├── <uuid>-<original-filename>.jpg
  └── <uuid>-<original-filename>.png
```

### 5. Amazon Bedrock

**Models Supported**:
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (Recommended)
- `amazon.nova-lite-v1:0`
- `amazon.nova-pro-v1:0`

**API**: Converse API (multimodal support)

**Request Format**:
```json
{
  "modelId": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "image": {
            "format": "png",
            "source": {
              "bytes": "<base64-encoded-image>"
            }
          }
        },
        {
          "text": "<fraud-detection-prompt>"
        }
      ]
    }
  ]
}
```

**Response Format**:
```json
{
  "output": {
    "message": {
      "role": "assistant",
      "content": [
        {
          "text": "{\"verdict\":\"AI_GENERATED\",\"confidence\":0.92,\"hints\":[...]}"
        }
      ]
    }
  }
}
```

**System Prompt**:
```
You are a claims fraud screener. Analyze this image and determine if it appears to be AI-generated or digitally manipulated.

Return your analysis as JSON with these fields:
- verdict: One of "AI_GENERATED", "LIKELY_REAL", or "INCONCLUSIVE"
- confidence: A number between 0 and 1 indicating your confidence
- hints: An array of 3-6 short observations explaining your decision

Focus on: lighting inconsistencies, texture repetition, edge artifacts, unnatural reflections, depth of field anomalies, and other AI generation artifacts.
```

### 6. CloudWatch Observability

**Log Groups**:
- `/aws/lambda/generatePresignedUrl`
- `/aws/lambda/analyzeImage`

**Log Retention**: 30 days (configurable)

**Custom Metrics**:

| Metric Name | Dimensions | Unit | Description |
|-------------|------------|------|-------------|
| Verdict | VerdictType | Count | Number of each verdict type |
| Confidence | Verdict | None | Confidence score by verdict |
| Latency | - | Milliseconds | Processing time |
| ErrorRate | ErrorType | Count | Errors by type |

**CloudWatch Insights Queries**:

```sql
-- Average confidence by verdict
fields verdict, confidence
| stats avg(confidence) by verdict

-- P99 latency
fields latency
| stats percentile(latency, 99)

-- Error rate over time
filter @message like /ERROR/
| stats count() by bin(5m)
```

## Data Flow Sequence

```
1. User → React App: Select image file
2. React → API Gateway: POST /presign {fileName, fileType}
3. API Gateway → generatePresignedUrl Lambda
4. Lambda → S3: Generate presigned PUT URL
5. Lambda → React: Return {url, key, bucket}
6. React → S3: PUT image using presigned URL
7. S3 → React: Return 200 OK
8. React → API Gateway: POST /analyze {bucket, key}
9. API Gateway → analyzeImage Lambda
10. Lambda → S3: GetObject(bucket, key)
11. S3 → Lambda: Return image bytes
12. Lambda → Bedrock: Converse API with image + prompt
13. Bedrock → Lambda: Return AI analysis JSON
14. Lambda → CloudWatch: Log results + emit metrics
15. Lambda → React: Return {verdict, confidence, hints}
16. React → User: Display analysis results
```

## Security Considerations

### Defense in Depth

1. **Network Layer**: VPC not required (serverless services are managed)
2. **API Layer**: 
   - CORS restrictions
   - Request validation
   - Rate limiting (API Gateway throttling)
3. **Application Layer**:
   - Input validation in Lambda
   - File type restrictions
   - Size limits
4. **Data Layer**:
   - Presigned URLs with expiration
   - S3 Block Public Access
   - Encryption at rest (SSE-S3)
5. **Access Control**:
   - IAM least privilege
   - No long-lived credentials
   - Lambda execution roles

### Compliance & Privacy

- **Data Retention**: Auto-delete uploads after 30 days
- **Logging**: No PII in logs
- **Encryption**: All data encrypted in transit (HTTPS/TLS) and at rest (SSE-S3)
- **Audit Trail**: Complete CloudWatch logs for all operations

## Cost Estimation

### Monthly Costs (1000 images/month)

| Service | Usage | Cost |
|---------|-------|------|
| API Gateway | 2000 requests | $0.00 |
| Lambda | 2000 invocations @ 256MB + 1GB, 2s avg | $0.02 |
| S3 Storage | 5 GB avg | $0.12 |
| S3 Requests | 2000 PUTs + GETs | $0.01 |
| Bedrock | 1000 images @ Claude 3.5 Sonnet | $12.00* |
| CloudWatch | Logs + Metrics | $0.50 |
| Amplify Hosting | Static site | $0.00** |
| **Total** | | **~$12.65/month** |

*Bedrock pricing varies by model and input tokens  
**Amplify free tier includes 15GB storage + 100GB transfer

### Scaling Costs

- **10,000 images/month**: ~$125/month
- **100,000 images/month**: ~$1,250/month

Most cost is Bedrock AI inference. Consider batching or model optimization for high volume.

## Performance Characteristics

### Latency Breakdown

| Operation | Typical Latency |
|-----------|----------------|
| Presigned URL generation | 50-100ms |
| S3 direct upload | 200-500ms (depends on file size) |
| S3 GetObject | 50-100ms |
| Bedrock inference | 2-5 seconds |
| **Total user experience** | **3-6 seconds** |

### Scalability

- **API Gateway**: 10,000 req/s (soft limit, can be increased)
- **Lambda**: 1,000 concurrent executions per region (soft limit)
- **S3**: Unlimited throughput
- **Bedrock**: Model-dependent, typically 10-100 req/s

### Optimization Opportunities

1. **Caching**: Cache presigned URL generation for identical files
2. **Compression**: Resize/compress images before sending to Bedrock
3. **Parallelization**: Batch process multiple images
4. **Model Selection**: Use faster/cheaper models for initial screening

## Deployment

### Infrastructure as Code

Recommended tools:
- **AWS CDK** (Python/TypeScript)
- **Terraform**
- **AWS SAM**

### CI/CD Pipeline

```
1. Code commit to Git
2. Run linters and tests
3. Build Lambda deployment packages
4. Deploy infrastructure (IaC)
5. Deploy frontend to Amplify
6. Run integration tests
7. Monitor CloudWatch metrics
```

### Environment Strategy

- **dev**: Development environment with lower limits
- **staging**: Pre-production testing
- **prod**: Production with full monitoring

## Monitoring & Alerting

### CloudWatch Alarms

1. **High Error Rate**: > 5% errors in 5 minutes
2. **High Latency**: P99 > 10 seconds
3. **Low Confidence**: Average confidence < 0.5 (may indicate model issues)
4. **Lambda Throttling**: Concurrent execution limit reached

### Dashboards

Create CloudWatch dashboard with:
- Request volume (API Gateway)
- Error rates (Lambda)
- Latency (P50, P90, P99)
- Verdict distribution
- Confidence score trends
- Cost tracking

## Disaster Recovery

### Backup Strategy
- S3 versioning can be enabled if needed
- Lambda functions stored in Git
- Infrastructure as Code enables rapid rebuild

### Recovery Time Objectives
- **RTO**: < 1 hour (redeploy from IaC)
- **RPO**: < 1 hour (S3 is highly durable, 99.999999999%)

### Multi-Region Considerations
- For global deployment, replicate to multiple regions
- Use Route53 for DNS failover
- S3 cross-region replication for image storage

## Troubleshooting Guide

### Common Issues

1. **CORS Errors**
   - Verify Amplify domain in S3 CORS config
   - Check API Gateway CORS settings
   - Ensure preflight OPTIONS requests work

2. **Presigned URL Expired**
   - URLs expire after 15 minutes
   - Generate new URL if upload fails

3. **Bedrock Throttling**
   - Implement exponential backoff
   - Request quota increase
   - Consider using faster models for initial triage

4. **Lambda Timeout**
   - Increase timeout limit
   - Optimize image size
   - Use streaming where possible

## References

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [API Gateway HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
