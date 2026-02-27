# Database Column Mapping Rules (CRITICAL)

> [!IMPORTANT]
> This project uses a non-standard naming convention for the `client_id` and `created_by` columns in the `bookings` table. This was a result of architectural constraints during the implementation of the Midwife feature.

## The Logic

| Scenario                        | `client_id` Column | `created_by` Column     |
| :------------------------------ | :----------------- | :---------------------- |
| **Client books for themselves** | Client ID          | Client ID               |
| **Midwife books for a Client**  | **Midwife ID**     | **Patient (Client) ID** |

### Why this matters:

When fetching "Patient" or "Client" details for an appointment (e.g., to pre-fill a checkout form or send a confirmation email), you should prioritize the `created_by` column if you want the actual person the appointment is for.

### Implementation Guidelines:

1. **Identifying the Patient**: Always check `created_by` first. If `created_by` and `client_id` are different, `created_by` is the patient and `client_id` is the midwife/staff.
2. **Pre-filling Forms**: Use the record associated with `created_by` to get the patient's name, email, and phone.
3. **Data Fetching**: When joining users, be aware that `client_id` might refer to a `midwife` role user, while `created_by` will refer to a `client` role user.
