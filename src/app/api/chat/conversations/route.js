import { NextResponse } from 'next/server';

// Configuración dinámica condicional - solo se aplica en producción
export const dynamic = process.env.NODE_ENV === 'production' ? 'force-static' : 'force-dynamic';

// Base URL for the new API
const API_URL = 'https://waagentv1.onrender.com/api/conversations';

export async function GET(request) {
  try {
    // Get user_id from query params
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    // Call the new endpoint
    const response = await fetch(`${API_URL}?user_id=${user_id}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching conversations:', data);
      return NextResponse.json({ error: data.error || 'Error fetching conversations' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, external_id, platform = 'web' } = body;
    
    if (!user_id || !external_id) {
      return NextResponse.json({ error: 'user_id and external_id are required' }, { status: 400 });
    }
    
    // Call the new endpoint to create a conversation
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        external_id,
        platform,
        status: 'active'
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error creating conversation:', data);
      return NextResponse.json({ error: data.error || 'Error creating conversation' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    // Call the new endpoint to update a conversation
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating conversation:', data);
      return NextResponse.json({ error: data.error || 'Error updating conversation' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    
    // Call the new endpoint to delete a conversation
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error deleting conversation:', errorData);
      return NextResponse.json({ error: errorData.error || 'Error deleting conversation' }, { status: response.status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
