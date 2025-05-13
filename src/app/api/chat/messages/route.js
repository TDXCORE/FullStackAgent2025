import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Base URL for the new API
const API_URL = 'https://waagentv1.onrender.com/api/messages';

export async function GET(request) {
  try {
    // Get conversation_id from query params
    const { searchParams } = new URL(request.url);
    const conversation_id = searchParams.get('conversation_id');
    
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }
    
    // Call the new endpoint
    const response = await fetch(`${API_URL}?conversation_id=${conversation_id}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching messages:', data);
      return NextResponse.json({ error: data.error || 'Error fetching messages' }, { status: response.status });
    }
    
    // Transform data for frontend if needed
    // This assumes the API returns data in a format that needs transformation
    // If the API already returns data in the expected format, this can be simplified
    const messages = data.map(message => ({
      id: message.id,
      types: message.role === 'user' ? 'sent' : 'received',
      text: message.content,
      time: new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: message.message_type,
      media_url: message.media_url
    }));
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { conversation_id, content, message_type = 'text', media_url } = body;
    
    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'conversation_id and content are required' }, { status: 400 });
    }
    
    // Call the new endpoint to create a message
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id,
        role: 'user', // Messages from the web interface are always from the user
        content,
        message_type,
        media_url
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error creating message:', data);
      return NextResponse.json({ error: data.error || 'Error creating message' }, { status: response.status });
    }
    
    // Transform for frontend if needed
    const message = {
      id: data.id,
      types: 'sent',
      text: data.content,
      time: new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      message_type: data.message_type,
      media_url: data.media_url
    };
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error in messages API:', error);
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
    
    // Call the new endpoint to update a message
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating message:', data);
      return NextResponse.json({ error: data.error || 'Error updating message' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in messages API:', error);
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
    
    // Call the new endpoint to delete a message
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error deleting message:', errorData);
      return NextResponse.json({ error: errorData.error || 'Error deleting message' }, { status: response.status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
