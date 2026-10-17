'use client';

import React, { useState } from 'react';
import { siteConfig } from '../../config/site';
import { Card, Button, Input, useToast } from '../../components/ui';
import { Mail, MapPin, Clock, Phone, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export default function ContactPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field (hidden from real users)
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await apiClient('/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          website: website.trim(), // Honeypot trap for automated spam bots
        }),
      });

      setIsSent(true);
      toastSuccess(
        'Message Received',
        'Our support team will get back to you within 24 business hours.',
      );
    } catch (err: any) {
      const msg = err.message || 'Unable to submit contact message. Please try again.';
      setErrorMessage(msg);
      toastError('Submission Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-course-darkBlue mb-1">
          Support &amp; Communications
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-course-darkBlue tracking-tight">
          Contact Course Support
        </h1>
        <p className="text-xs md:text-sm text-course-navyMuted mt-2">
          Have questions about the industrial curriculum, bulk corporate enrollments, or billing?
          Reach out to us.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="border border-black p-6 bg-course-white flex items-start gap-4">
            <Mail className="w-6 h-6 text-course-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Support Email
              </div>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-base font-bold text-course-darkBlue hover:text-course-orange underline mt-0.5 block"
              >
                {siteConfig.supportEmail}
              </a>
              <div className="text-xs text-course-navyMuted mt-1">
                Typical response time: Within 24 business hours
              </div>
            </div>
          </div>

          <div className="border border-black p-6 bg-course-white flex items-start gap-4">
            <MapPin className="w-6 h-6 text-course-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Registered Office
              </div>
              <div className="text-sm font-bold text-course-darkBlue mt-0.5">
                {siteConfig.contact.address}
              </div>
              <div className="text-xs text-course-navyMuted mt-1">
                Physical correspondence &amp; administrative office
              </div>
            </div>
          </div>

          <div className="border border-black p-6 bg-course-white flex items-start gap-4">
            <Clock className="w-6 h-6 text-course-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Support Desk Hours
              </div>
              <div className="text-sm font-bold text-course-darkBlue mt-0.5">
                {siteConfig.contact.hours}
              </div>
              <div className="text-xs text-course-navyMuted mt-1">
                Closed on Sundays and national public holidays
              </div>
            </div>
          </div>

          <div className="border border-black p-6 bg-course-white flex items-start gap-4">
            <Phone className="w-6 h-6 text-course-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-course-navySubtle">
                Phone Support
              </div>
              <div className="text-sm font-bold text-course-darkBlue mt-0.5 font-mono">
                {siteConfig.contact.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <Card variant="default">
          {isSent ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 bg-course-orangeSubtle text-course-orange inline-flex items-center justify-center border border-black">
                <CheckCircle2 className="w-6 h-6 text-course-orange" />
              </div>
              <h3 className="text-xl font-black text-course-darkBlue tracking-tight">
                Inquiry Submitted
              </h3>
              <p className="text-xs md:text-sm text-course-navyMuted max-w-xs mx-auto leading-relaxed">
                Thank you for contacting us. We have received your inquiry and our support team will
                respond directly to <strong>{email}</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSent(false);
                  setSubject('');
                  setMessage('');
                  setErrorMessage(null);
                }}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-course-darkBlue uppercase tracking-tight mb-4">
                Send Us a Message
              </h2>

              {errorMessage && (
                <div className="p-3 mb-4 bg-red-50 border border-red-500 text-red-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field: invisible to human users, traps spam bots */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    opacity: 0,
                    height: 0,
                    width: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <label htmlFor="website-field">Leave this empty</label>
                  <input
                    id="website-field"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <Input
                  label="Your Name"
                  placeholder="Ramesh Kumar"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="engineer@plant.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Subject / Topic"
                  placeholder="e.g. Course access question or corporate invoice"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />

                <div className="w-full flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-course-darkBlue">
                    Message Details <span className="text-course-error ml-1">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-base resize-none py-2"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-black uppercase tracking-wider py-3"
                  isLoading={isLoading}
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit Message
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
