variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "S3 bucket name for artifacts"
  type        = string
  default     = "pelican-artifacts"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "pelican"
}
