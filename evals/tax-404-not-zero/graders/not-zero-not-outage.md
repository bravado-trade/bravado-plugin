The response must explain that 404 with available:false means the batch job has
not produced output for that wallet yet — the data does not exist rather than
being zero — and must not report a $0 year.

It must also not describe it as an outage or advise retrying in a loop, since
retrying does not make the batch run.

Fails if it concludes there was no taxable activity.
