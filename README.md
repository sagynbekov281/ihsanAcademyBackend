# IhsanAcademy — Backend

Backend для приёма заявок на курсы с сайта. Стек: Node.js + Express + MongoDB.

Что делает:
1. Принимает заявку с формы (имя, фамилия, курс, телефон).
2. Сохраняет её в MongoDB.
3. Уведомляет менеджера о новой заявке по email, если настроен Resend.
4. Даёт админский эндпоинт для просмотра всех заявок и смены статуса (pending / approved / rejected).

---

## 1. Локальный запуск (для проверки)

```bash
cd ihsan-academy-backend
npm install
cp .env.example .env
```

Заявки принимаются без SMS-подтверждения. Для уведомлений менеджера настрой `RESEND_API_KEY` и
`MANAGER_EMAIL`; без них заявка всё равно сохранится в MongoDB.

Для MONGODB_URI на этом шаге можно использовать бесплатный MongoDB Atlas (см. ниже) или локальный
MongoDB, если он у тебя установлен.

```bash
npm run dev
```

Проверка: `curl http://localhost:5000/health` должен вернуть `{"ok":true, ...}`.

Тест отправки заявки:
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"Aigerim Nurlanovna","phone":"+996700123456","course":"Frontend","message":""}'
```

---

## 2. Бесплатная база данных — MongoDB Atlas

1. Зайди на https://www.mongodb.com/cloud/atlas/register и зарегистрируйся.
2. Создай бесплатный кластер **M0** (Free tier, 512 MB — хватит с большим запасом для заявок).
3. В "Database Access" создай пользователя с логином/паролем.
4. В "Network Access" добавь `0.0.0.0/0` (разрешить подключение отовсюду — backend на Render имеет
   динамический IP).
5. Нажми "Connect" → "Drivers" → скопируй строку подключения вида:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Вставь её в `.env` как `MONGODB_URI`, подставив свой логин/пароль, и добавь имя базы перед `?`:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ihsan_academy?retryWrites=true&w=majority
   ```

---

## 3. Бесплатный деплой backend — Render.com

1. Залей папку `ihsan-academy-backend` в отдельный репозиторий на GitHub.
2. Зайди на https://render.com, зарегистрируйся (можно через GitHub).
3. "New" → "Web Service" → выбери свой репозиторий.
4. Настройки:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
5. Во вкладке "Environment" добавь нужные переменные из `.env` (MONGODB_URI, ADMIN_API_KEY,
   CLIENT_ORIGIN, RESEND_API_KEY, MANAGER_EMAIL и т.д.) — сам файл `.env` никогда не заливается в git (он в
   `.gitignore`).
6. Deploy. Render даст тебе адрес вида `https://ihsan-academy-backend.onrender.com`.

Важно про бесплатный тариф Render: сервис "засыпает" после ~15 минут без запросов и первый запрос
после сна обрабатывается медленнее (~30-50 сек). Для учебного/небольшого проекта это нормально;
если станет мешать — есть платный тариф от $7/мес без засыпания, либо альтернативы Railway/Fly.io.

---

## 4. Подключение фронтенда (уже готово под твой проект)

В `frontend-example/` лежат готовые патчи под твой реальный код (Vite + React + TS + react-router):

1. **`CoursesPage.tsx`** — в кнопке "Записаться" внутри модалки курса добавь один пропс:
   ```tsx
   <Link
     to="/contact"
     state={{ course: selectedCourse.title }}   {/* ← добавить эту строку */}
     onClick={() => setSelected(null)}
     ...
   >
   ```
   Это передаёт название выбранного курса на страницу контактов через роутер.

2. **`ContactPage.tsx`** — замени файл на `frontend-example/ContactPage.updated.tsx`. Что изменилось
   относительно твоей версии:
   - через `useLocation()` читает курс, переданный с `/courses`, и сразу подставляет его в форму;
   - вместо фейкового `setSent(true)` делает реальный `fetch` на `POST /api/applications`;
   - есть состояния загрузки (кнопка "Отправка...") и показа ошибки, если сервер недоступен или
     данные некорректны;
   - поле `name` (как в твоей форме — одно поле ФИО) шлётся на backend как есть, отдельно разбивать
     на имя/фамилию не нужно.

3. Добавь в `.env` фронтенда (в Vercel → Settings → Environment Variables, и локально в
   `ihsan-academy/.env`):
   ```
   VITE_API_URL=https://ihsan-academy-backend.onrender.com
   ```
   Локально для разработки можно оставить `http://localhost:5000` (это значение по умолчанию, если
   переменная не задана).

4. В backend `.env` (в Render) в `CLIENT_ORIGIN` укажи точный адрес фронтенда на Vercel, например:
   ```
   CLIENT_ORIGIN=https://ihsan-academy-ghf9.vercel.app
   ```

---

## 5. Как посмотреть заявки в базе

Эндпоинт `GET /api/applications` защищён ключом. Пример запроса:

```bash
curl https://ihsan-academy-backend.onrender.com/api/applications \
  -H "x-admin-key: значение_твоего_ADMIN_API_KEY"
```

Вернёт список всех заявок (имя, фамилия, телефон, курс, статус, дата).

Изменить статус заявки (например подтвердить после звонка клиенту):
```bash
curl -X PATCH https://ihsan-academy-backend.onrender.com/api/applications/<ID>/status \
  -H "Content-Type: application/json" \
  -H "x-admin-key: значение_твоего_ADMIN_API_KEY" \
  -d '{"status":"approved"}'
```

Можно также посмотреть заявки напрямую в MongoDB Atlas через "Browse Collections" в их веб-интерфейсе
— без всякого кода.

---

## Структура проекта

```
ihsan-academy-backend/
├── package.json
├── .env.example
├── src/
│   ├── server.js              # точка входа
│   ├── config/db.js           # подключение MongoDB
│   ├── models/Application.js  # схема заявки
│   ├── routes/applications.js
│   ├── controllers/applicationController.js
│   ├── services/smsService.js # отправка SMS (console/nikita/smsc)
│   └── middleware/
│       ├── validate.js
│       └── errorHandler.js
└── frontend-example/
    └── EnrollmentForm.tsx     # пример формы записи на React+TS
```

---

## Что можно улучшить дальше (не сделано, чтобы не усложнять первую версию)

- Полноценная OTP-верификация (SMS с кодом, который клиент вводит обратно на сайте) — сейчас SMS
  это просто уведомление о получении заявки, а не проверка владения номером.
- Админ-панель с интерфейсом (сейчас — только API + просмотр в MongoDB Atlas).
- Email-уведомление менеджеру о новой заявке (тоже можно сделать бесплатно, например через
  Resend.com — 100 писем/день бесплатно).
