# get-policies

Lists/searches the AWS managed policies and copy the selected one to the clipboard.

```
npx get-policies
```

Example:

```
AWSAccountActivityAccess - ARN: arn:aws:iam::aws:policy/AWSAccountActivityAccess
AWSAccountUsageReportAccess - ARN: arn:aws:iam::aws:policy/AWSAccountUsageReportAccess
AWSAgentlessDiscoveryService - ARN: arn:aws:iam::aws:policy/AWSAgentlessDiscoveryService
AWSApplicationDiscoveryAgentAccess - ARN: arn:aws:iam::aws:policy/AWSApplicationDiscoveryAgentAccess
AWSApplicationDiscoveryServiceFullAccess - ARN: arn:aws:iam::aws:policy/AWSApplicationDiscoveryServiceFullAccess
AWSBatchFullAccess - ARN: arn:aws:iam::aws:policy/AWSBatchFullAccess
...
```

# Data source

The database with the latest AWS managed policies is maintained here: https://raw.githubusercontent.com/nicolasdao/get-raw-policies/master/managed-policies.json

The project that maintains this DB is https://github.com/nicolasdao/get-raw-policies.

# License

BSD 3-Clause License