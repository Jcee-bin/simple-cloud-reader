# Railway deployment

This deployment creates three Railway resources:

1. The API service connected to the GitHub repository.
2. A PostgreSQL database.
3. A private Storage Bucket.

## Configure the service

1. In Railway, create a project and choose **Deploy from GitHub repo**.
2. Select `Jcee-bin/simple-cloud-reader`.
3. Add PostgreSQL and a Storage Bucket to the same environment.
4. In the API service settings, set the config-as-code path to
   `/infra/railway/railway.json`.
5. Generate a public domain for the API.
6. Add the variables below and deploy.

Railway runs the checked-in migrations before starting the API. It only routes
traffic after `GET /health/ready` confirms that PostgreSQL and the bucket are
both reachable.

## Required variables

| API variable | Value |
| --- | --- |
| `DATABASE_URL` | Reference the PostgreSQL service's `DATABASE_URL`. |
| `JWT_SECRET` | Random secret of at least 32 characters. |
| `CURSOR_SECRET` | A different random secret of at least 32 characters. |
| `PUBLIC_APP_URL` | Public URL used in magic links during development. |
| `RESEND_API_KEY` | Resend server API key. |
| `AUTH_FROM_EMAIL` | Verified sender, such as `Reader <login@example.com>`. |
| `S3_ENDPOINT` | Reference the Bucket's `ENDPOINT`. |
| `S3_REGION` | Reference the Bucket's `REGION`. |
| `S3_ACCESS_KEY_ID` | Reference the Bucket's `ACCESS_KEY_ID`. |
| `S3_SECRET_ACCESS_KEY` | Reference the Bucket's `SECRET_ACCESS_KEY`. |
| `S3_BUCKET` | Reference the Bucket's `BUCKET`, not `RAILWAY_BUCKET_NAME`. |
| `S3_FORCE_PATH_STYLE` | `true` for Railway Storage Buckets. |

Railway injects `PORT`; do not set it unless troubleshooting a custom port.

Generate independent secrets locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit secrets or place them in Android resources, Windows packaging,
generated client code, logs, screenshots, or issue reports.

## Verify

After deployment, open:

```text
https://YOUR-DOMAIN/health/live
https://YOUR-DOMAIN/health/ready
```

The first endpoint proves the process is responding. The second returns `200`
only when the database and bucket can be reached. A dependency failure returns
`503` with component names but no connection strings or credentials.
