# Code Citations

## License: Apache-2.0
https://github.com/cuiliang0302/myblog/blob/9770fc0a2d5c7852d3f84994ef9e44d0731aa4fd/myblog.sql

```


Tu n'as pas encore modifié la config Nginx ! Le bloc `/admin/` proxy encore vers Django et le chemin secret n'est pas là. Utilise `sed` pour faire les deux modifications d'un coup :

```bash
sudo sed -i '/# Admin Django/,/}/c\    # Bloquer /admin publiquement\n    location /admin/ {\n        return 404;\n    }\n\n    # Admin Django via chemin secret\n    location /jet5-secure-panel-2026/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-
```


## License: Apache-2.0
https://github.com/cuiliang0302/myblog/blob/9770fc0a2d5c7852d3f84994ef9e44d0731aa4fd/myblog.sql

```


Tu n'as pas encore modifié la config Nginx ! Le bloc `/admin/` proxy encore vers Django et le chemin secret n'est pas là. Utilise `sed` pour faire les deux modifications d'un coup :

```bash
sudo sed -i '/# Admin Django/,/}/c\    # Bloquer /admin publiquement\n    location /admin/ {\n        return 404;\n    }\n\n    # Admin Django via chemin secret\n    location /jet5-secure-panel-2026/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-
```


## License: Apache-2.0
https://github.com/cuiliang0302/myblog/blob/9770fc0a2d5c7852d3f84994ef9e44d0731aa4fd/myblog.sql

```


Tu n'as pas encore modifié la config Nginx ! Le bloc `/admin/` proxy encore vers Django et le chemin secret n'est pas là. Utilise `sed` pour faire les deux modifications d'un coup :

```bash
sudo sed -i '/# Admin Django/,/}/c\    # Bloquer /admin publiquement\n    location /admin/ {\n        return 404;\n    }\n\n    # Admin Django via chemin secret\n    location /jet5-secure-panel-2026/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-
```


## License: Apache-2.0
https://github.com/cuiliang0302/myblog/blob/9770fc0a2d5c7852d3f84994ef9e44d0731aa4fd/myblog.sql

```


Tu n'as pas encore modifié la config Nginx ! Le bloc `/admin/` proxy encore vers Django et le chemin secret n'est pas là. Utilise `sed` pour faire les deux modifications d'un coup :

```bash
sudo sed -i '/# Admin Django/,/}/c\    # Bloquer /admin publiquement\n    location /admin/ {\n        return 404;\n    }\n\n    # Admin Django via chemin secret\n    location /jet5-secure-panel-2026/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-
```


## License: Apache-2.0
https://github.com/cuiliang0302/myblog/blob/9770fc0a2d5c7852d3f84994ef9e44d0731aa4fd/myblog.sql

```


Tu n'as pas encore modifié la config Nginx ! Le bloc `/admin/` proxy encore vers Django et le chemin secret n'est pas là. Utilise `sed` pour faire les deux modifications d'un coup :

```bash
sudo sed -i '/# Admin Django/,/}/c\    # Bloquer /admin publiquement\n    location /admin/ {\n        return 404;\n    }\n\n    # Admin Django via chemin secret\n    location /jet5-secure-panel-2026/ {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' /etc/nginx/sites-
```

