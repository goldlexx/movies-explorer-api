<div align="center">

# 🎬 Movies Explorer API

REST API для аккаунтов и сохранённых фильмов Movies Explorer на Cloudflare Workers и D1.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-f38020?logo=cloudflare&logoColor=fff)](https://workers.cloudflare.com/) [![D1](https://img.shields.io/badge/D1-SQLite-f38020?logo=cloudflare&logoColor=fff)](https://developers.cloudflare.com/d1/)

</div>

## Возможности

- регистрация и вход с JWT;
- PBKDF2-хеширование паролей через Web Crypto;
- чтение и обновление профиля;
- создание и удаление собственных сохранённых фильмов.

## API

| Метод | Путь | Доступ |
|---|---|---|
| `POST` | `/signup` | публичный |
| `POST` | `/signin` | публичный |
| `GET`, `PATCH` | `/users/me` | Bearer JWT |
| `GET`, `POST` | `/movies` | Bearer JWT |
| `DELETE` | `/movies/:id` | владелец карточки |

## Рабочий Worker

[movies-explorer-api.rustik-yuldashev.workers.dev](https://movies-explorer-api.rustik-yuldashev.workers.dev)

## Установка и запуск

```bash
npm ci
npm run db:migrate:local
npm run dev
```

Для локального запуска используйте `.dev.vars`. Production-секреты не хранятся в Git.

## Технологии

Cloudflare Workers, D1, JavaScript, Web Crypto, JWT.

## Лицензия

Лицензия в репозитории не указана.
