# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

# Placeholder content for an empty/template repository.
# Replace this file when the application code is added.
RUN echo '<!doctype html><html><head><meta charset="utf-8"><title>gymlog</title>' \
    '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:4rem auto;padding:0 1rem;color:#222}' \
    'h1{margin-bottom:.25rem}code{background:#f4f4f4;padding:.15rem .35rem;border-radius:4px}</style></head>' \
    '<body><h1>gymlog</h1><p>This deployment is live.</p>' \
    '<p>The <code>gymlog</code> repository does not yet contain application code — this is a placeholder page served by nginx.</p>' \
    '<p>Push a Dockerfile or source code and re-deploy to replace this page.</p></body></html>' \
    > /usr/share/nginx/html/index.html

# Minimal nginx config: SPA-friendly try_files with a static-asset block.
RUN printf '%s\n' \
  'server {' \
  '    listen 80;' \
  '    root /usr/share/nginx/html;' \
  '    location ~* \.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map|webp)$ {' \
  '        try_files $uri =404;' \
  '    }' \
  '    location / {' \
  '        try_files $uri $uri/ /index.html;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
