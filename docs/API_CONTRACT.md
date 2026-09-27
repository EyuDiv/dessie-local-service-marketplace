# Addis Local Service Marketplace — API Contract

This document provides the complete API specification for the Addis Local Service Marketplace Laravel REST API. All endpoints, parameters, validation constraints, authorization levels, and error codes documented below reflect the verified backend implementation.

---

## Table of Contents

1. [Authentication Endpoints](#1-authentication)
2. [Services Endpoints (Catalog)](#2-services)
3. [Provider Endpoints](#3-providers)
4. [Service Request Endpoints](#4-service-requests)
5. [Review Endpoints](#5-reviews)
6. [Admin Endpoints](#6-admin-endpoints)
7. [Frontend Integration Notes](#frontend-integration-notes)

---

## 1. Authentication

### `POST /api/register`
* **Authentication:** None (Public)
* **Allowed Role:** Anyone (`customer` or `provider` registration)
* **Purpose:** Register a new customer or service provider account and issue a Sanctum personal access token.
* **Request Body:**
  ```json
  {
    "name": "Abebe Kebede",
    "email": "abebe@example.com",
    "phone": "+251911223344",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "customer",
    "business_name": "Optional Business Name (if provider)",
    "description": "Optional description (if provider)",
    "experience_years": 4,
    "location": "Bole"
  }
  ```
* **Validation Rules:**
  * `name`: required, string, max:255
  * `email`: required, string, email, max:255, unique:users,email
  * `phone`: required, string, max:50
  * `password`: required, string, min:8, confirmed
  * `role`: required, string, in:customer,provider (*`admin` is strictly forbidden*)
  * `business_name`: nullable, string, max:255
  * `description`: nullable, string
  * `experience_years`: nullable, integer, min:0
  * `location`: nullable, string, max:255
* **Successful Response (201 Created):**
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": 1,
      "name": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911223344",
      "role": "customer",
      "created_at": "2026-09-26T22:00:00.000000Z",
      "updated_at": "2026-09-26T22:00:00.000000Z"
    },
    "token": "1|sanctum_plain_text_token..."
  }
  ```
* **Important Errors:**
  * `422 Unprocessable Entity`: Validation failure (e.g. duplicate email, passwords do not match, or role is `admin`).
* **Security & Ownership:**
  * Public registration cannot create `admin` accounts.
  * If `role === 'provider'`, automatically initializes a `provider_profiles` record with `availability_status: offline` and `verification_status: pending`.

---

### `POST /api/login`
* **Authentication:** None (Public)
* **Allowed Role:** Anyone with an existing account
* **Purpose:** Authenticate credentials and issue a new Sanctum Bearer token.
* **Request Body:**
  ```json
  {
    "email": "abebe@example.com",
    "password": "password123"
  }
  ```
* **Validation Rules:**
  * `email`: required, string, email
  * `password`: required, string
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": 1,
      "name": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911223344",
      "role": "customer"
    },
    "token": "2|sanctum_plain_text_token..."
  }
  ```
* **Important Errors:**
  * `401 Unauthorized`: Invalid email or password.
  * `422 Unprocessable Entity`: Missing fields.
* **Security & Ownership:** Passwords are never returned in responses.

---

### `POST /api/logout`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** Any authenticated user
* **Purpose:** Revoke the specific access token used in the current request.
* **Request Body:** None
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
* **Important Errors:**
  * `401 Unauthorized`: Missing or invalid Bearer token.

---

### `GET /api/me`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** Any authenticated user
* **Purpose:** Retrieve the currently authenticated user's profile and roles.
* **Successful Response (200 OK):**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Abebe Kebede",
      "email": "abebe@example.com",
      "phone": "+251911223344",
      "role": "customer"
    }
  }
  ```
* **Important Errors:**
  * `401 Unauthorized`: Unauthenticated.

---

## 2. Services

### `GET /api/services`
* **Authentication:** None (Public)
* **Allowed Role:** Any visitor
* **Purpose:** List all services available in the platform catalog.
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Plumbing",
        "description": "Pipe and drainage repairs"
      }
    ]
  }
  ```

---

### `GET /api/services/{id}`
* **Authentication:** None (Public)
* **Allowed Role:** Any visitor
* **Purpose:** Retrieve details of a single service by ID.
* **Successful Response (200 OK):**
  ```json
  {
    "data": {
      "id": 1,
      "name": "Plumbing",
      "description": "Pipe and drainage repairs"
    }
  }
  ```
* **Important Errors:**
  * `404 Not Found`: Service does not exist.

---

### `POST /api/services`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin`
* **Purpose:** Add a new service category to the catalog.
* **Request Body:**
  ```json
  {
    "name": "Electrical",
    "description": "Wiring, sockets, and lighting fixes"
  }
  ```
* **Validation Rules:**
  * `name`: required, string, max:255, unique:services,name
  * `description`: required, string
* **Successful Response (201 Created):**
  ```json
  {
    "message": "Service created successfully",
    "data": {
      "id": 2,
      "name": "Electrical",
      "description": "Wiring, sockets, and lighting fixes"
    }
  }
  ```
* **Important Errors:**
  * `401 Unauthorized`: Unauthenticated.
  * `403 Forbidden`: Authenticated user is not an admin.
  * `422 Unprocessable Entity`: Name already exists or missing fields.

---

### `PUT /api/services/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin`
* **Purpose:** Update a service's name or description.
* **Request Body:**
  ```json
  {
    "name": "Electrical Maintenance",
    "description": "Residential & commercial electrical services"
  }
  ```
* **Validation Rules:**
  * `name`: required, string, max:255, unique (excluding current service id)
  * `description`: required, string
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Service updated successfully",
    "data": {
      "id": 2,
      "name": "Electrical Maintenance",
      "description": "Residential & commercial electrical services"
    }
  }
  ```
* **Important Errors:**
  * `403 Forbidden`: Non-admin access.
  * `404 Not Found`: Service does not exist.
  * `422 Unprocessable Entity`: Validation failure.

---

### `DELETE /api/services/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin`
* **Purpose:** Delete an unused service from the catalog.
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Service deleted successfully"
  }
  ```
* **Important Errors:**
  * `403 Forbidden`: Non-admin access.
  * `404 Not Found`: Service does not exist.
  * `409 Conflict`: Cannot delete because the service has existing service requests or is currently offered by providers (preserves transaction history).

---

## 3. Providers

### `GET /api/providers`
* **Authentication:** None (Public Discovery)
* **Allowed Role:** Any visitor
* **Purpose:** Discover service providers who are verified.
* **Query Parameters (Optional Filters):**
  * `service_id`: Filter providers who offer a specific service ID (e.g. `?service_id=1`)
  * `location`: Filter by neighborhood (e.g. `?location=Bole`)
  * `availability_status`: Filter by availability (`available`, `busy`, `offline`)
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "user_id": 2,
        "business_name": "Mulugeta Plumbing",
        "description": "Certified plumbing repairs in Bole",
        "experience_years": 8,
        "location": "Bole",
        "availability_status": "available",
        "verification_status": "verified",
        "services": [
          {
            "id": 1,
            "name": "Plumbing",
            "description": "Pipe repair"
          }
        ]
      }
    ]
  }
  ```
* **Security & Filtering Rules:**
  * Only providers with `verification_status = 'verified'` are returned. Unverified or rejected providers are never exposed publicly.
  * No passwords, tokens, or sensitive customer details are leaked.

---

### `GET /api/providers/{provider}/reviews`
* **Authentication:** None (Public)
* **Allowed Role:** Any visitor
* **Purpose:** View reviews and ratings for a specific provider profile ID.
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "customer_id": 3,
        "provider_id": 1,
        "rating": 5,
        "comment": "Quick and professional work!",
        "created_at": "2026-09-26T22:30:00.000000Z",
        "customer": {
          "id": 3,
          "name": "Abebe Kebede"
        }
      }
    ]
  }
  ```
* **Security Rules:** Exposes only customer `id` and `name`. Never exposes phone, email, or passwords.

---

### `GET /api/provider/profile`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** View the authenticated provider's own business profile.
* **Successful Response (200 OK):**
  ```json
  {
    "data": {
      "id": 1,
      "user_id": 2,
      "business_name": "Mulugeta Plumbing",
      "description": "Certified plumbing repairs in Bole",
      "experience_years": 8,
      "location": "Bole",
      "availability_status": "available",
      "verification_status": "verified"
    }
  }
  ```
* **Important Errors:**
  * `403 Forbidden`: User is not a provider.

---

### `PUT /api/provider/profile`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Update own business information.
* **Request Body:**
  ```json
  {
    "business_name": "Mulugeta Advanced Plumbing",
    "description": "Specialized in emergency leak repairs",
    "experience_years": 9,
    "location": "Kazanchis"
  }
  ```
* **Validation Rules:**
  * `business_name`: required, string, max:255
  * `description`: nullable, string
  * `experience_years`: required, integer, min:0
  * `location`: required, string, max:255
* **Security Rules:** `user_id`, `verification_status`, and `availability_status` are immutable through this endpoint.

---

### `PUT /api/provider/availability`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Update current working availability status.
* **Request Body:**
  ```json
  {
    "availability_status": "available"
  }
  ```
* **Validation Rules:**
  * `availability_status`: required, in:available,busy,offline
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Availability status updated successfully",
    "data": {
      "id": 1,
      "availability_status": "available"
    }
  }
  ```

---

### `GET /api/provider/services`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** List services currently offered by the authenticated provider.
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "Plumbing",
        "description": "Pipe and drainage repairs"
      }
    ]
  }
  ```

---

### `POST /api/provider/services`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Attach an existing catalog service to the provider's profile.
* **Request Body:**
  ```json
  {
    "service_id": 1
  }
  ```
* **Validation Rules:**
  * `service_id`: required, integer, exists:services,id
* **Successful Response (201 Created):**
  ```json
  {
    "message": "Service added successfully",
    "data": {
      "id": 1,
      "name": "Plumbing",
      "description": "Pipe repair"
    }
  }
  ```
* **Important Errors:**
  * `409 Conflict`: Service is already offered by this provider.

---

### `DELETE /api/provider/services/{service}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Detach a service from the provider's profile.
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Service removed successfully"
  }
  ```
* **Important Errors:**
  * `404 Not Found`: Service not found in provider's catalog.
* **Integrity:** Only detaches the pivot record from `provider_services`; does NOT delete the service from `services`.

---

## 4. Service Requests

### `POST /api/requests`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** Create a service request for a verified provider offering that specific service.
* **Request Body:**
  ```json
  {
    "provider_id": 1,
    "service_id": 1,
    "description": "Water leak underneath the kitchen sink",
    "location": "Bole Medhanialem",
    "requested_date": "2026-10-05",
    "requested_time": "14:30"
  }
  ```
* **Validation Rules:**
  * `provider_id`: required, integer, exists:provider_profiles,id
  * `service_id`: required, integer, exists:services,id
  * `description`: required, string
  * `location`: required, string, max:255
  * `requested_date`: required, valid date
  * `requested_time`: required, valid time format (`H:i` or `H:i:s`)
* **Business Checks (Server Enforced):**
  1. Provider must have `verification_status === 'verified'` (otherwise `422`).
  2. Provider must offer `service_id` via `provider_services` (otherwise `422`).
  3. `customer_id` is automatically set to `$request->user()->id`. Client cannot spoof this.
  4. Initial status is always `pending`.
* **Successful Response (201 Created):**
  ```json
  {
    "message": "Service request created successfully",
    "data": {
      "id": 1,
      "customer_id": 3,
      "provider_id": 1,
      "service_id": 1,
      "description": "Water leak underneath the kitchen sink",
      "location": "Bole Medhanialem",
      "requested_date": "2026-10-05",
      "requested_time": "14:30",
      "status": "pending",
      "provider": { "id": 1, "business_name": "Mulugeta Plumbing", "location": "Bole" },
      "service": { "id": 1, "name": "Plumbing" }
    }
  }
  ```

---

### `GET /api/requests`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** List all service requests submitted by the authenticated customer.
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "customer_id": 3,
        "provider_id": 1,
        "service_id": 1,
        "status": "pending",
        "description": "Water leak",
        "requested_date": "2026-10-05",
        "requested_time": "14:30"
      }
    ]
  }
  ```
* **Security:** Exposes strictly the authenticated customer's own requests.

---

### `GET /api/requests/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** View details of a specific service request.
* **Important Errors:**
  * `403 Forbidden`: Request belongs to another customer.
  * `404 Not Found`: Request does not exist.

---

### `PUT /api/requests/{id}/cancel`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** Cancel a pending or accepted service request.
* **Transition Rule:** Allowed only from `pending` or `accepted` status.
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Service request cancelled successfully",
    "data": {
      "id": 1,
      "status": "cancelled"
    }
  }
  ```
* **Important Errors:**
  * `403 Forbidden`: Belongs to another customer.
  * `409 Conflict`: Request is already `in_progress`, `completed`, `rejected`, or `cancelled`.

---

### `GET /api/provider/requests`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** List service requests assigned to the authenticated provider's profile.
* **Successful Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "status": "pending",
        "description": "Water leak",
        "customer": { "id": 3, "name": "Abebe Kebede", "phone": "+251911223344" },
        "service": { "id": 1, "name": "Plumbing" }
      }
    ]
  }
  ```

---

### `GET /api/provider/requests/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** View one service request assigned to the provider.
* **Important Errors:**
  * `403 Forbidden`: Request is assigned to another provider.

---

### `PUT /api/provider/requests/{id}/accept`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Transition request status from `pending` -> `accepted`.
* **Important Errors:**
  * `403 Forbidden`: Request assigned to another provider.
  * `409 Conflict`: Request status is not `pending`.

---

### `PUT /api/provider/requests/{id}/reject`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Transition request status from `pending` -> `rejected`.
* **Important Errors:**
  * `403 Forbidden`: Request assigned to another provider.
  * `409 Conflict`: Request status is not `pending`.

---

### `PUT /api/provider/requests/{id}/start`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Transition request status from `accepted` -> `in_progress`.
* **Important Errors:**
  * `403 Forbidden`: Request assigned to another provider.
  * `409 Conflict`: Request status is not `accepted`.

---

### `PUT /api/provider/requests/{id}/complete`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider`
* **Purpose:** Transition request status from `in_progress` -> `completed`.
* **Important Errors:**
  * `403 Forbidden`: Request assigned to another provider.
  * `409 Conflict`: Request status is not `in_progress`.

---

## 5. Reviews

### `POST /api/reviews`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** Submit a review and rating for a completed service request.
* **Request Body:**
  ```json
  {
    "request_id": 1,
    "rating": 5,
    "comment": "Punctual, professional, and excellent quality work!"
  }
  ```
* **Validation Rules:**
  * `request_id`: required, integer, exists:service_requests,id
  * `rating`: required, integer, min:1, max:5
  * `comment`: nullable, string
* **Business Checks (Server Enforced):**
  1. The request must belong to the authenticated customer (otherwise `403`).
  2. The request must have `status === 'completed'` (otherwise `422`).
  3. The request must not already have a review (otherwise `409 Conflict`).
  4. `customer_id` and `provider_id` are derived automatically from the request and authenticated user.
* **Successful Response (201 Created):**
  ```json
  {
    "message": "Review created successfully",
    "data": {
      "id": 1,
      "request_id": 1,
      "customer_id": 3,
      "provider_id": 1,
      "rating": 5,
      "comment": "Punctual, professional, and excellent quality work!"
    }
  }
  ```

---

### `GET /api/reviews`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** List all reviews written by the authenticated customer.

---

### `GET /api/reviews/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** View a single review written by the customer.
* **Important Errors:**
  * `403 Forbidden`: Review belongs to another customer.

---

### `PUT /api/reviews/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** Update the rating or comment of the customer's own review.
* **Request Body:**
  ```json
  {
    "rating": 5,
    "comment": "Updated comments..."
  }
  ```
* **Validation Rules:**
  * `rating`: required, integer, min:1, max:5
  * `comment`: nullable, string
* **Security:** `request_id`, `customer_id`, and `provider_id` cannot be modified.

---

### `DELETE /api/reviews/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `customer`
* **Purpose:** Delete own review.
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Review deleted successfully"
  }
  ```
* **Integrity:** Deletes only the review; service request, provider profile, and service remain intact.

---

### `GET /api/provider/reviews`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider` (Read-only)
* **Purpose:** List all reviews and ratings received by the authenticated provider.

---

### `GET /api/provider/reviews/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `provider` (Read-only)
* **Purpose:** View single review received by the provider.
* **Important Errors:**
  * `403 Forbidden`: Review was written for another provider.

---

## 6. Admin Endpoints

### `GET /api/admin/providers`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin`
* **Purpose:** List all registered provider profiles with their contact details (`name`, `email`, `phone`) and verification statuses.

---

### `PUT /api/admin/providers/{id}/verification`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin`
* **Purpose:** Update a provider's verification status.
* **Request Body:**
  ```json
  {
    "verification_status": "verified"
  }
  ```
* **Validation Rules:**
  * `verification_status`: required, in:verified,rejected,pending
* **Successful Response (200 OK):**
  ```json
  {
    "message": "Provider verification status updated successfully",
    "data": {
      "id": 1,
      "verification_status": "verified"
    }
  }
  ```

---

### `GET /api/admin/requests`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin` (Read-only)
* **Purpose:** List all service requests across the marketplace with customer, provider, and service relationships.

---

### `GET /api/admin/requests/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin` (Read-only)
* **Purpose:** View details of any single service request.

---

### `GET /api/admin/reviews`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin` (Read-only)
* **Purpose:** List all customer reviews across the platform.

---

### `GET /api/admin/reviews/{id}`
* **Authentication:** Required (`auth:sanctum`)
* **Allowed Role:** `admin` (Read-only)
* **Purpose:** View any single review and its complete transaction relationships.

---

## Frontend Integration Notes

### 1. Base API URL
* Local development base URL: `http://127.0.0.1:8000/api`

### 2. Request Headers
For all JSON requests, send:
```http
Accept: application/json
Content-Type: application/json
```

For protected routes, include the Bearer token in the `Authorization` header:
```http
Authorization: Bearer {token}
```

### 3. Authentication & Token Management
1. When calling `POST /api/register` or `POST /api/login`, the API returns a response containing:
   * `user`: User details (`id`, `name`, `email`, `role`, etc.)
   * `token`: Plaintext Bearer token
2. Store the token securely in the frontend client (e.g. `HttpOnly` cookie or secure storage).
3. Attach `Authorization: Bearer <token>` to all subsequent protected calls.
4. Calling `POST /api/logout` invalidates the active device token on the backend.

### 4. Role-Based Access Matrix

| Route Category | Public | Customer | Provider | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Register & Login | **Yes** | **Yes** | **Yes** | **Yes** |
| Service Catalog Browsing (`GET /services`) | **Yes** | **Yes** | **Yes** | **Yes** |
| Provider Discovery (`GET /providers`) | **Yes** | **Yes** | **Yes** | **Yes** |
| Provider Reviews Display (`GET /providers/{id}/reviews`) | **Yes** | **Yes** | **Yes** | **Yes** |
| Current User (`GET /me`, `POST /logout`) | No | **Yes** | **Yes** | **Yes** |
| Service Management (`POST/PUT/DELETE /services`) | No | No | No | **Yes** |
| Customer Requests (`/requests*`) | No | **Yes** | No | No |
| Customer Reviews (`/reviews*`) | No | **Yes** | No | No |
| Provider Profile & Availability (`/provider/*`) | No | No | **Yes** | No |
| Provider Requests Workflow (`/provider/requests*`) | No | No | **Yes** | No |
| Provider Reviews Read-Only (`/provider/reviews*`) | No | No | **Yes** | No |
| Admin Verification & Oversight (`/admin/*`) | No | No | No | **Yes** |

### 5. Service Request Lifecycle Flow
```
[ pending ]
     │
     ├──> [ accepted ] ──> [ in_progress ] ──> [ completed ] ──> (Can be reviewed)
     │         │
     ├──> [ rejected ]
     │         │
     └──> [ cancelled ] <───────┘
```
* **Cancellation:** Only customer can cancel, and only from `pending` or `accepted` status.
* **Provider Progression:** Provider transitions through `/accept`, `/start`, and `/complete`.
* **Reviews:** Only requests in `completed` status can be reviewed. Exactly one review per request.

### 6. Standard Error Codes
* `401 Unauthorized`: Token missing, invalid, or expired.
* `403 Forbidden`: Authenticated user does not possess the required role, or is attempting to access another user's private resource (IDOR protection).
* `404 Not Found`: Model or route does not exist.
* `409 Conflict`: Invalid state transition, duplicate review, duplicate provider-service assignment, or attempt to delete an in-use catalog service.
* `422 Unprocessable Entity`: Validation failure, provider not verified, or provider does not offer requested service.
