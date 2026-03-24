'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import type { XYPosition } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Types
interface ParsedStep {
  id: string;
  description: string;
  type: 'input' | 'action' | 'output';
  confidence: number;
}

interface FlowData {
  description: string;
  steps: ParsedStep[];
  createdAt: string;
}

// Custom Node Component
function StepNode({ data }: { data: Record<string, unknown> }) {
  const step = data.step as ParsedStep;
  const status = data.status as string;
  
  const bgColor = step.type === 'input' 
    ? 'bg-blue-100 dark:bg-blue-900 border-blue-500' 
    : step.type === 'output' 
      ? 'bg-green-100 dark:bg-green-900 border-green-500'
      : 'bg-purple-100 dark:bg-purple-900 border-purple-500';

  const statusColors: Record<string, string> = {
    pending: 'border-gray-300',
    running: 'border-yellow-500 animate-pulse',
    completed: 'border-green-500',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${bgColor} ${statusColors[status] || 'border-gray-300'} min-w-[200px] max-w-[300px]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
          {step.type}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          step.confidence >= 0.8 ? 'bg-green-200 text-green-800' :
          step.confidence >= 0.6 ? 'bg-yellow-200 text-yellow-800' :
          'bg-red-200 text-red-800'
        }`}>
          {Math.round(step.confidence * 100)}%
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {step.description}
      </p>
      {status === 'running' && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
          <span className="text-xs text-yellow-700 dark:text-yellow-300">Executing...</span>
        </div>
      )}
      {status === 'completed' && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-green-600 dark:text-green-400">✓ Done</span>
        </div>
      )}
    </div>
  );
}

// Mock AI Parser - Simulates parsing natural language into steps
function parseTaskDescription(description: string): ParsedStep[] {
  const sentences = description
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (sentences.length === 0) {
    return [];
  }

  const steps: ParsedStep[] = sentences.map((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    let type: 'input' | 'action' | 'output' = 'action';
    
    if (index === 0 || lowerSentence.includes('start') || lowerSentence.includes('begin') || lowerSentence.includes('first')) {
      type = 'input';
    } else if (index === sentences.length - 1 || lowerSentence.includes('end') || lowerSentence.includes('finish') || lowerSentence.includes('result')) {
      type = 'output';
    }

    let confidence = 0.7 + (Math.random() * 0.25);
    if (lowerSentence.includes('then') || lowerSentence.includes('next')) confidence = Math.min(1, confidence + 0.1);
    if (lowerSentence.split(' ').length < 3) confidence = Math.max(0.5, confidence - 0.2);
    if (lowerSentence.includes('maybe') || lowerSentence.includes('might')) confidence = Math.max(0.5, confidence - 0.15);

    return {
      id: `step-${index}`,
      description: sentence,
      type,
      confidence: Math.round(confidence * 100) / 100,
    };
  });

  return steps;
}

// Initial nodes/edges
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Main App Component
export default function Home() {
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<ParsedStep[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [savedFlows, setSavedFlows] = useState<FlowData[]>([]);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const nodeTypes = useMemo(() => ({ stepNode: StepNode }), []);

  // Load saved flows from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('flowspeak_flows');
    if (stored) {
      try {
        setSavedFlows(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved flows:', e);
      }
    }
  }, []);

  // Parse description into steps
  const handleParse = useCallback(() => {
    if (!description.trim()) return;

    const parsedSteps = parseTaskDescription(description);
    setSteps(parsedSteps);

    const newNodes: Node[] = parsedSteps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      position: { x: 250, y: index * 120 } as XYPosition,
      data: { step, status: 'pending' },
    }));

    const newEdges: Edge[] = parsedSteps.slice(0, -1).map((step, index) => ({
      id: `edge-${step.id}`,
      source: step.id,
      target: parsedSteps[index + 1].id,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: false,
    }));

    setNodes(newNodes);
    setEdges(newEdges);
    setIsPreviewMode(false);
  }, [description, setNodes, setEdges]);

  // Update step description
  const handleEditStep = useCallback((stepId: string, newDescription: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, description: newDescription } : s
    ));
    setNodes(prev => prev.map(n => 
      n.id === stepId 
        ? { ...n, data: { ...n.data, step: { ...(n.data.step as ParsedStep), description: newDescription } } }
        : n
    ));
    setEditingStepId(null);
    setEditText('');
  }, [setNodes]);

  // Preview execution
  const handlePreview = useCallback(async () => {
    if (steps.length === 0) return;
    
    setIsPreviewMode(true);
    
    for (let i = 0; i < steps.length; i++) {
      setNodes(prev => prev.map((n, idx) => ({
        ...n,
        data: {
          ...n.data,
          status: idx < i ? 'completed' : idx === i ? 'running' : 'pending',
        },
      })));
      setEdges(prev => prev.map((e, idx) => ({
        ...e,
        animated: idx === i - 1,
      })));
      
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    }

    setNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, status: 'completed' },
    })));
    setEdges(prev => prev.map(e => ({ ...e, animated: false })));
    setIsPreviewMode(false);
  }, [steps, setNodes, setEdges]);

  // Save flow to localStorage
  const handleSave = useCallback(() => {
    if (steps.length === 0) return;

    const flow: FlowData = {
      description,
      steps,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFlows, flow];
    setSavedFlows(updated);
    localStorage.setItem('flowspeak_flows', JSON.stringify(updated));
  }, [description, steps, savedFlows]);

  // Load a saved flow
  const handleLoadFlow = useCallback((flow: FlowData) => {
    setDescription(flow.description);
    setSteps(flow.steps);
    
    const newNodes: Node[] = flow.steps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      position: { x: 250, y: index * 120 } as XYPosition,
      data: { step, status: 'pending' },
    }));

    const newEdges: Edge[] = flow.steps.slice(0, -1).map((step, index) => ({
      id: `edge-${step.id}`,
      source: step.id,
      target: flow.steps[index + 1].id,
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
    setIsPreviewMode(false);
  }, [setNodes, setEdges]);

  // Clear all
  const handleClear = useCallback(() => {
    setDescription('');
    setSteps([]);
    setNodes([]);
    setEdges([]);
    setIsPreviewMode(false);
  }, [setNodes, setEdges]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">FlowSpeak</h1>
                <p className="text-sm text-gray-400">Natural Language Task Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {steps.length > 0 && `${steps.length} steps`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Input Section */}
        <div className="mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Describe your task in plain English
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: First, I need to gather all customer data from the spreadsheet. Then, validate each email address. Next, send a welcome email to valid addresses. Finally, log the results."
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isPreviewMode}
            />
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleParse}
                disabled={!description.trim() || isPreviewMode}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Parse Task
                </span>
              </button>
              <button
                onClick={handlePreview}
                disabled={steps.length === 0 || isPreviewMode}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Preview Execution
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={steps.length === 0}
                className="px-6 py-2.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/20"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Flow
                </span>
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-2.5 bg-red-500/20 text-red-300 font-medium rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Steps List */}
        {steps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Parsed Steps ({steps.length})
            </h2>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {editingStepId === step.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditStep(step.id, editText)}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingStepId(null); setEditText(''); }}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">{step.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              step.type === 'input' ? 'bg-blue-500/20 text-blue-300' :
                              step.type === 'output' ? 'bg-green-500/20 text-green-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {step.type}
                            </span>
                            <span className="text-xs text-gray-400">
                              Confidence: {Math.round(step.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => { setEditingStepId(step.id); setEditText(step.description); }}
                          className="text-gray-400 hover:text-white p-1"
                          disabled={isPreviewMode}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flow Visualization */}
        {steps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Visual Flow
            </h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden" style={{ height: '400px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Background color="#aaa" gap={16} />
                <Controls className="bg-white/10" />
              </ReactFlow>
            </div>
          </div>
        )}

        {/* Saved Flows */}
        {savedFlows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Saved Flows ({savedFlows.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {savedFlows.map((flow, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => handleLoadFlow(flow)}
                >
                  <p className="text-white text-sm line-clamp-2 mb-2">{flow.description.slice(0, 100)}...</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{flow.steps.length} steps</span>
                    <span>{new Date(flow.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {steps.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Describe Your Task</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Type a natural language description of your task above, and FlowSpeak will parse it into visual steps.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            FlowSpeak — Natural Language Task Builder • Build • Visualize • Preview
          </p>
        </div>
      </footer>
    </div>
  );
}