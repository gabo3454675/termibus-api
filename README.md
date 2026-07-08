# TermiBus API

Backend NestJS para despacho FIFO de terminales de autobuses.

## Desarrollo

```bash
docker compose up -d
cp .env.example .env
npm install
npm run start:dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Desarrollo con hot reload |
| `npm run build` | Compilar |
| `npm run start:prod` | Producción |

## Módulos

- `auth` — JWT login
- `despachos` — Cola FIFO, asignación automática y manual
- `andenes`, `lineas`, `unidades`, `conductores`, `destinos` — CRUD
- `tablero` — Endpoint público para TV
- `reportes` — Métricas operativas
- `websocket` — Eventos en tiempo real

## Seed

Con `SEED_ON_START=true`, carga datos demo al primer arranque.

Usuarios: `admin`, `despachador`, `conductor` — contraseña `termibus123`
