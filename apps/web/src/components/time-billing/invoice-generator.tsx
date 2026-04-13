/**
 * Invoice Generator Component
 * Create and manage invoices
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { FileText, Plus, DollarSign, Send, Eye, Download } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
}

interface InvoiceGeneratorProps {
  workspaceId: string;
  projectId?: string;
}

export function InvoiceGenerator({ workspaceId, projectId }: InvoiceGeneratorProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    projectId: projectId || '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    notes: '',
    taxRate: 0,
    lineItems: [
      { description: '', quantity: 1, unitPrice: 0 },
    ],
  });

  useEffect(() => {
    loadInvoices();
  }, [workspaceId, projectId]);

  const loadInvoices = async () => {
    try {
      let url = `/api/time/billing/invoices?workspaceId=${workspaceId}`;
      if (projectId) {
        url += `&projectId=${projectId}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const addLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      lineItems: [...newInvoice.lineItems, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...newInvoice.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewInvoice({ ...newInvoice, lineItems: updated });
  };

  const removeLineItem = (index: number) => {
    const updated = newInvoice.lineItems.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, lineItems: updated });
  };

  const calculateTotal = () => {
    const subtotal = newInvoice.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = subtotal * (newInvoice.taxRate / 100);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const createInvoice = async () => {
    try {
      const totals = calculateTotal();

      const response = await fetch('/api/time/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceData: {
            workspaceId,
            projectId: newInvoice.projectId,
            clientId: newInvoice.clientId,
            issueDate: new Date(newInvoice.issueDate),
            dueDate: new Date(newInvoice.dueDate),
            paymentTerms: newInvoice.paymentTerms,
            notes: newInvoice.notes,
            createdBy: 'current-user-id', // Replace with actual user ID
          },
          lineItems: newInvoice.lineItems,
          taxRate: newInvoice.taxRate,
        }),
      });

      if (response.ok) {
        setIsCreating(false);
        loadInvoices();
        // Reset form
        setNewInvoice({
          projectId: projectId || '',
          clientId: '',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentTerms: 'Net 30',
          notes: '',
          taxRate: 0,
          lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
        });
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      await fetch(`/api/time/billing/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      loadInvoices();
    } catch (error) {
      console.error('Failed to update invoice status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'default', label: 'Sent' },
      paid: { variant: 'default', label: 'Paid', className: 'bg-green-600' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };

    const config = variants[status] || variants.draft;
    return <Badge {...config}>{config.label}</Badge>;
  };

  const totals = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">Create and manage client invoices</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Create Invoice Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>New Invoice</CardTitle>
            <CardDescription>Create a new invoice for billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={newInvoice.issueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Payment Terms</Label>
              <Input
                value={newInvoice.paymentTerms}
                onChange={(e) => setNewInvoice({ ...newInvoice, paymentTerms: e.target.value })}
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {newInvoice.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      {newInvoice.lineItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLineItem(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={newInvoice.taxRate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, taxRate: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({newInvoice.taxRate}%):</span>
                <span className="font-semibold">${totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createInvoice}>Create Invoice</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No invoices created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold mb-1">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          Issued: {new Date(invoice.issueDate).toLocaleDateString()} · Due:{' '}
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">${invoice.totalAmount.toFixed(2)}</div>
                          {getStatusBadge(invoice.status)}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Download">
                            <Download className="w-4 h-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateInvoiceStatus(invoice.id, 'sent')}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Send
                            </Button>
                          )}
                          {invoice.status === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

