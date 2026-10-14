import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/ai/robot/route';

describe('Autonomous Robot AI Assistant API', () => {
  it('identifies autonomous navigation to practice quizzes', async () => {
    const req = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Take me to practice quizzes' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.action.type).toBe('navigate');
    expect(data.action.url).toBe('/practice');
    expect(data.spokenText).toBeTruthy();
  });

  it('identifies autonomous navigation to mistakes bank', async () => {
    const req = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Show me my mistakes bank' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.action.type).toBe('navigate');
    expect(data.action.url).toBe('/practice/mistakes');
  });

  it('identifies study timer command', async () => {
    const req = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Set a 25 min timer' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.action.type).toBe('timer');
    expect(data.action.minutes).toBe(25);
  });

  it('identifies instant quiz launch request', async () => {
    const req = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Quiz me on Photosynthesis' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.action.type).toBe('start_quiz');
    expect(data.action.topic?.toLowerCase()).toContain('photosynthesis');
  });

  it('formats mathematical statements with paper notation in replies', async () => {
    const req = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'What is the power rule for d/dx[x^3]?' }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.reply).toBeTruthy();
    expect(data.reply).not.toContain('^');
  });

  it('answers to both CyberVen and Nessa wake words', async () => {
    const reqNessa = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello Nessa, what can you do?' }),
    });

    const resNessa = await POST(reqNessa);
    const dataNessa = await resNessa.json();
    expect(resNessa.status).toBe(200);
    expect(dataNessa.reply).toBeTruthy();

    const reqCyberVen = new Request('http://localhost/api/ai/robot', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hey CyberVen, take me to dashboard' }),
    });

    const resCyberVen = await POST(reqCyberVen);
    const dataCyberVen = await resCyberVen.json();
    expect(resCyberVen.status).toBe(200);
    expect(dataCyberVen.action.type).toBe('navigate');
    expect(dataCyberVen.action.url).toBe('/dashboard');
  });
});
