# Role-Based Authentication & Redirects

This guide explains how to implement server-side role-based authentication with automatic redirects in Next.js using Supabase.

## Overview

We use **server-side authentication** to check user roles before rendering pages, providing:
- ✅ **No loading states** - Instant redirects
- ✅ **Better performance** - Single server check
- ✅ **Better security** - Role check before content renders
- ✅ **Better UX** - Clean redirects without flash of content

## Implementation

### 1. Server Component Structure

Create a server component that handles authentication and role checking:

```typescript
// app/dashboard/locations/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LocationsClient from './locations-client';

export default async function LocationsPage() {
  // Get the server-side Supabase client
  const supabase = await createClient();
  
  // Get the current user (server-side authenticated)
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (authError || !authUser) {
    redirect('/auth/login');
  }

  // Get user data directly from the database using server client
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  // If user not found in database, redirect to login
  if (userError || !user) {
    redirect('/auth/login');
  }

  // If user is not admin, redirect to dashboard
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Render the page for admin users
  return <LocationsClient />;
}
```

### 2. Client Component for Interactive Features

Create a separate client component for interactive functionality:

```typescript
// app/dashboard/locations/locations-client.tsx
'use client';

import { useState, useEffect } from 'react';
// ... other imports

export default function LocationsClient() {
  // All your interactive logic here
  // State management, API calls, etc.
  
  return (
    <div>
      {/* Your page content */}
    </div>
  );
}
```

## Database Setup

### 1. Users Table with RLS

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'staff', 'midwife', 'client')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy (avoid recursion)
CREATE POLICY "basic_auth_check" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);
```

### 2. Automatic User Creation

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Role-Based Access Patterns

### 1. Admin-Only Pages

```typescript
// Only admin users can access
if (user.role !== 'admin') {
  redirect('/dashboard');
}
```

### 2. Staff and Admin Access

```typescript
// Staff and admin users can access
if (!['admin', 'staff'].includes(user.role)) {
  redirect('/dashboard');
}
```

### 3. Multiple Role Checks

```typescript
// Different redirects based on role
if (user.role === 'client') {
  redirect('/dashboard');
} else if (user.role === 'staff') {
  redirect('/dashboard/staff');
} else if (user.role !== 'admin') {
  redirect('/dashboard');
}
```

## Common Issues & Solutions

### 1. Infinite Recursion in RLS Policies

**Problem**: RLS policies that query the same table they protect cause infinite recursion.

**Solution**: Use simple policies that don't query the protected table:

```sql
-- ❌ BAD - Causes recursion
CREATE POLICY "Admin check" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ✅ GOOD - No recursion
CREATE POLICY "basic_auth_check" ON users
    FOR ALL USING (auth.uid() IS NOT NULL);
```

### 2. Server-Side Supabase Client

**Problem**: Using client-side Supabase client in server components.

**Solution**: Use the server-side client:

```typescript
// ❌ BAD - Client-side client
import { createClient } from '@/lib/supabase/client';

// ✅ GOOD - Server-side client
import { createClient } from '@/lib/supabase/server';
```

### 3. Authentication Check Order

**Problem**: Checking role before authentication.

**Solution**: Always check authentication first:

```typescript
// ✅ Correct order
1. Check if user is authenticated
2. Get user data from database
3. Check user role
4. Redirect or render
```

## Best Practices

### 1. Server-Side Authentication
- ✅ Use server components for authentication
- ✅ Check authentication before role
- ✅ Use `redirect()` for clean redirects

### 2. RLS Policies
- ✅ Keep policies simple
- ✅ Avoid querying the same table in policies
- ✅ Test policies thoroughly

### 3. Error Handling
- ✅ Handle authentication errors
- ✅ Handle database errors
- ✅ Provide fallback redirects

### 4. Performance
- ✅ Single server-side check
- ✅ No client-side API calls for auth
- ✅ Instant redirects

## Example: Complete Implementation

```typescript
// app/dashboard/admin-only/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminOnlyClient from './admin-only-client';

export default async function AdminOnlyPage() {
  const supabase = await createClient();
  
  // 1. Check authentication
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    redirect('/auth/login');
  }

  // 2. Get user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  if (userError || !user) {
    redirect('/auth/login');
  }

  // 3. Check role
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  // 4. Render for admin users
  return <AdminOnlyClient />;
}
```

This approach provides secure, performant role-based access control with clean user experience.
