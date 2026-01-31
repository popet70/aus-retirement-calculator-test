/**
 * API Route: /api/generate-pdf-report
 * 
 * Generates a PDF retirement planning report
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'mainSuperBalance',
      'sequencingBuffer',
      'currentAge',
      'retirementAge',
      'baseSpending',
      'chartData',
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Use OS temp directory (works on Windows, Mac, Linux)
    const tempDir = os.tmpdir();
    const tempDataPath = path.join(tempDir, `retirement-data-${Date.now()}.json`);
    const tempPdfPath = path.join(tempDir, `retirement-report-${Date.now()}.pdf`);
    
    // Write data to temp file
    fs.writeFileSync(tempDataPath, JSON.stringify(data));
    
    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_pdf_report.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: 'PDF generation script not found', path: scriptPath },
        { status: 500 }
      );
    }
    
    // Execute Python script - try python3 first, then python
    let pythonCommand = 'python3';
    
    // On Windows, typically just 'python'
    if (process.platform === 'win32') {
      pythonCommand = 'python';
    }
    
    const python = spawn(pythonCommand, [scriptPath, tempDataPath, tempPdfPath]);
    
    let errorOutput = '';
    let stdOutput = '';
    
    python.stdout.on('data', (data) => {
      stdOutput += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}:\nSTDERR: ${errorOutput}\nSTDOUT: ${stdOutput}`));
        } else {
          resolve(true);
        }
      });
      
      python.on('error', (err) => {
        reject(new Error(`Failed to start Python: ${err.message}`));
      });
    });
    
    // Check if PDF was created
    if (!fs.existsSync(tempPdfPath)) {
      return NextResponse.json(
        { error: 'PDF file was not created', stderr: errorOutput, stdout: stdOutput },
        { status: 500 }
      );
    }
    
    // Read generated PDF
    const pdfBuffer = fs.readFileSync(tempPdfPath);
    
    // Clean up temp files
    try {
      fs.unlinkSync(tempDataPath);
      fs.unlinkSync(tempPdfPath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="retirement-plan.pdf"',
      },
    });
    
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF report', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
