import { NextResponse } from 'next/server';
import { wsClient } from '@/services/chatService';

// Configuración estática para compatibilidad con exportación estática
export const dynamic = 'force-static';

// Base URL for the new API - Usa la variable de entorno
const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waagentv1.onrender.com/api'}/users`;

export async function GET() {
  try {
    try {
      // Intentar usar WebSocket primero con el parámetro getAll
      await wsClient.connect();
      const result = await wsClient.getUsers(true);
      
      // Verificar si la respuesta contiene usuarios
      if (!result.users || !Array.isArray(result.users)) {
        console.error('Respuesta inesperada del servidor WebSocket:', result);
        throw new Error('Formato de respuesta inesperado');
      }
      
      // Transformar datos para mantener compatibilidad con el formato actual
      const contacts = result.users.map(user => ({
        id: user.id,
        name: user.full_name || user.phone || user.email || 'Usuario sin nombre',
        // Generate avatar data (since it's not in the schema)
        avatar: {
          type: "init",
          variant: "primary", // Can randomize this based on user.id
          title: user.full_name ? user.full_name.charAt(0).toUpperCase() : 
                 (user.phone ? user.phone.charAt(0).toUpperCase() : 
                 (user.email ? user.email.charAt(0).toUpperCase() : 'U'))
        },
        status: "offline", // Default status
        lastChat: "Click to start conversation",
        time: new Date(user.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        unread: 0
      }));
      
      console.log(`Obtenidos ${contacts.length} contactos vía WebSocket`);
      
      return NextResponse.json(contacts);
    } catch (wsError) {
      console.error('Error fetching users via WebSocket:', wsError);
      
      // Fallback a REST API si WebSocket falla
      const response = await fetch(API_URL);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching users:', data);
        return NextResponse.json({ error: data.error || 'Error fetching users' }, { status: response.status });
      }
      
      // Transform data for frontend
      const contacts = data.map(user => ({
        id: user.id,
        name: user.full_name || user.phone || user.email || 'Usuario sin nombre',
        // Generate avatar data (since it's not in the schema)
        avatar: {
          type: "init",
          variant: "primary", // Can randomize this based on user.id
          title: user.full_name ? user.full_name.charAt(0).toUpperCase() : 
                 (user.phone ? user.phone.charAt(0).toUpperCase() : 
                 (user.email ? user.email.charAt(0).toUpperCase() : 'U'))
        },
        status: "offline", // Default status
        lastChat: "Click to start conversation",
        time: new Date(user.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        unread: 0
      }));
      
      console.log(`Obtenidos ${contacts.length} contactos vía REST API`);
      
      return NextResponse.json(contacts);
    }
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Call the new endpoint to create a user
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error creating user:', data);
      return NextResponse.json({ error: data.error || 'Error creating user' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in users API:', error);
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
    
    // Call the new endpoint to update a user
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating user:', data);
      return NextResponse.json({ error: data.error || 'Error updating user' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in users API:', error);
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
    
    // Call the new endpoint to delete a user
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error deleting user:', errorData);
      return NextResponse.json({ error: errorData.error || 'Error deleting user' }, { status: response.status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
