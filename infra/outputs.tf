output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.artifacts.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.artifacts.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.cdn.id
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name (use this as CLOUDFRONT_URL)"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "uploader_access_key_id" {
  description = "Access key ID for the uploader IAM user"
  value       = aws_iam_access_key.uploader.id
}

output "uploader_secret_access_key" {
  description = "Secret access key for the uploader IAM user"
  value       = aws_iam_access_key.uploader.secret
  sensitive   = true
}
