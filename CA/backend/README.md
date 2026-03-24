# CA Automation Backend

Modern modular backend architecture for CA automation tools.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   └── core/
│       ├── __init__.py
│       └── cors.py          # CORS configuration
├── features/
│   ├── __init__.py
│   ├── gst_reconciliation/  # GST reconciliation feature
│   │   ├── __init__.py
│   │   ├── router.py        # API endpoints
│   │   ├── service.py       # Business logic
│   │   ├── normalization.py # Invoice normalization
│   │   ├── excel_utils.py   # Excel processing utilities
│   │   └── jobs.py          # Job management
│   ├── invoice_extraction/  # Invoice extraction feature
│   │   ├── __init__.py
│   │   ├── router.py
│   │   └── service.py
│   ├── tds_calculation/     # TDS calculation feature
│   │   ├── __init__.py
│   │   ├── router.py
│   │   └── service.py
│   ├── ledger_classification/ # Ledger classification feature
│   │   ├── __init__.py
│   │   ├── router.py
│   │   └── service.py
│   └── auth/                # Authentication & authorization
│       ├── __init__.py
│       ├── router.py
│       ├── service.py
│       └── models.py
├── requirements.txt
└── render.yaml
```

## Running the Application

### Development

```bash
# From the backend directory
cd backend
python -m app.main
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

## Adding New Features

To add a new feature module:

1. Create a new folder under `features/` (e.g., `features/invoice_extraction/`)
2. Add `__init__.py` to make it a Python package
3. Create `router.py` with your API endpoints
4. Create `service.py` with your business logic
5. Register the router in `app/main.py`:

```python
from features.your_feature.router import router as your_router
app.include_router(your_router)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### GST Reconciliation
- `POST /api/gst/check` - Upload Excel file for processing
- `GET /api/gst/status/{job_id}` - Check processing status
- `GET /api/gst/download/{job_id}` - Download processed file

### Invoice Extraction
- `POST /api/invoice/extract` - Extract data from invoice
- `GET /api/invoice/health` - Service health check

### TDS Calculation
- `POST /api/tds/calculate` - Calculate TDS from data
- `GET /api/tds/health` - Service health check

### Ledger Classification
- `POST /api/ledger/classify` - Classify ledger entries
- `GET /api/ledger/health` - Service health check

### Health Check
- `GET /health` - Application health status
