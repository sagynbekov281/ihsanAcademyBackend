import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RiSendPlaneLine, RiTelegramLine, RiWhatsappLine, RiInstagramLine, RiMapPinLine, RiPhoneLine, RiMailLine, RiTimeLine, RiArrowDownSLine } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import AnimSection from '../components/AnimSection';
import { faqs } from '../data';

// URL backend. Добавь в .env фронтенда: VITE_API_URL=https://твой-backend.onrender.com
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ContactPage() {
  const { t } = useTranslation();
  const location = useLocation();

  // Курс, переданный со страницы /courses при клике на "Записаться" (state={{ course }})
  const incomingCourse = (location.state as { course?: string } | null)?.course || '';

  const [form, setForm] = useState({ name: '', phone: '', course: incomingCourse, message: '' });
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const courses = [
    t('contact.courses.frontend'),
    t('contact.courses.backend'),
    t('contact.courses.uiux'),
    t('contact.courses.data'),
    t('contact.courses.cyber'),
    t('contact.courses.mobile'),
  ];

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          course: form.course,
          message: form.message,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          Array.isArray(data.errors) ? data.errors.join(', ') : data.error || 'Не удалось отправить заявку. Проверьте данные и попробуйте снова.'
        );
        setSubmitting(false);
        return;
      }

      setSent(true);
      setForm({ name: '', phone: '', course: '', message: '' });
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setError('Не удалось связаться с сервером. Проверьте интернет-соединение и попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-[#0B0D1A] border border-[#1E2448] rounded-xl px-4 py-3 text-white text-sm placeholder-[#7A82A8] focus:outline-none focus:border-[#5B5BD6] transition-colors";

  return (
    <main className="min-h-screen pt-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <AnimSection className="max-w-xl mb-12">
          <p className="text-[#7B7FE8] text-xs font-semibold uppercase tracking-widest mb-2">{t('contact.tag')}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">{t('contact.title')}</h1>
          <p className="text-[#7A82A8] text-sm leading-relaxed">
            {t('contact.description')}
          </p>
        </AnimSection>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-16 items-stretch">
          {/* Form */}
          <AnimSection className="lg:col-span-3 flex flex-col">
            <div className="border border-[#1E2448] rounded-2xl p-6 sm:p-8 bg-[#111428]/80 flex flex-col flex-1">
              <h2 className="font-display text-lg font-semibold text-white mb-6">{t('contact.formTitle')}</h2>
              {sent && (
                <div className="mb-5 p-3.5 rounded-xl bg-[#5B5BD6]/15 border border-[#5B5BD6]/30 text-[#7B7FE8] text-sm">
                  {t('contact.successMsg')} Мы отправили SMS-подтверждение на указанный номер.
                </div>
              )}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={submit} className="flex flex-col flex-1 gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#7A82A8] mb-1.5 block">{t('contact.labelName')} *</label>
                    <input name="name" value={form.name} onChange={handle} required placeholder={t('contact.placeholderName')} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[#7A82A8] mb-1.5 block">{t('contact.labelPhone')} *</label>
                    <input name="phone" value={form.phone} onChange={handle} required placeholder={t('contact.placeholderPhone')} className={inputCls} />
                  </div>
                </div>

                {/* Custom dropdown */}
                <div className="relative">
                  <label className="text-xs text-[#7A82A8] mb-1.5 block">{t('contact.labelCourse')}</label>
                  <button
                    type="button"
                    onClick={() => setOpen(p => !p)}
                    className="w-full bg-[#0B0D1A] border border-[#1E2448] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5B5BD6] transition-colors flex items-center justify-between"
                  >
                    <span className={form.course ? 'text-white' : 'text-[#7A82A8]'}>
                      {form.course || t('contact.placeholderCourse')}
                    </span>
                    <RiArrowDownSLine
                      className={`text-[#7A82A8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      size={18}
                    />
                  </button>

                  {open && (
                    <div className="absolute z-50 mt-2 w-full bg-[#0B0D1A] border border-[#1E2448] rounded-2xl overflow-hidden shadow-xl">
                      {courses.map(course => (
                        <div
                          key={course}
                          onClick={() => { setForm(p => ({ ...p, course })); setOpen(false); }}
                          className={`px-5 py-3 text-sm cursor-pointer transition-colors hover:bg-[#5B5BD6]/20 hover:text-white
                            ${form.course === course ? 'text-[#7B7FE8] bg-[#5B5BD6]/10' : 'text-[#7A82A8]'}`}
                        >
                          {course}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1">
                  <label className="text-xs text-[#7A82A8] mb-1.5 block">{t('contact.labelMessage')}</label>
                  <textarea
                    name="message" value={form.message} onChange={handle}
                    rows={7} placeholder={t('contact.placeholderMessage')}
                    className={`${inputCls} resize-none flex-1`}
                    style={{ minHeight: '160px' }}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary violet-glow w-full justify-center mt-auto disabled:opacity-60 disabled:cursor-not-allowed">
                  <RiSendPlaneLine size={16} />
                  {submitting ? 'Отправка...' : t('contact.submitBtn')}
                </button>
              </form>
            </div>
          </AnimSection>

          {/* Info */}
          <AnimSection className="lg:col-span-2 flex flex-col gap-4">
            <div className="border border-[#1E2448] rounded-2xl p-5 bg-[#111428]/80">
              <h3 className="text-white font-semibold text-sm mb-4">{t('contact.infoTitle')}</h3>
              <div className="space-y-3.5">
                {[
                  { icon: RiMapPinLine, label: t('contact.labelAddress'), value: t('contact.address') },
                  { icon: RiPhoneLine,  label: t('contact.labelPhoneInfo'), value: t('contact.phone') },
                  { icon: RiMailLine,   label: t('contact.labelEmail'),   value: t('contact.email') },
                  { icon: RiTimeLine,   label: t('contact.labelHours'),    value: t('contact.hours') },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#5B5BD6]/15 border border-[#5B5BD6]/25 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="text-[#7B7FE8]" size={14} />
                    </div>
                    <div>
                      <p className="text-[#7A82A8] text-xs mb-0.5">{label}</p>
                      <p className="text-white text-sm">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#1E2448] rounded-2xl p-5 bg-[#111428]/80">
              <h3 className="text-white font-semibold text-sm mb-4">{t('contact.socialTitle')}</h3>
              <div className="space-y-2.5">
                {[
                  { icon: RiTelegramLine,  label: 'Telegram',  val: '@ihsan_academy' },
                  { icon: RiInstagramLine, label: 'Instagram', val: '@ihsanacademy' },
                  { icon: RiWhatsappLine,  label: 'WhatsApp',  val: '+996 700 123 456' },
                ].map(({ icon: Icon, label, val }) => (
                  <a key={label} href="#" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#5B5BD6]/8 transition-all group">
                    <div className="w-7 h-7 rounded-lg bg-[#5B5BD6]/15 flex items-center justify-center">
                      <Icon className="text-[#7B7FE8]" size={14} />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{label}</p>
                      <p className="text-[#7A82A8] text-xs">{val}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </AnimSection>
        </div>

        {/* FAQ */}
        <AnimSection className="mb-2">
          <p className="text-[#7B7FE8] text-xs font-semibold uppercase tracking-widest mb-2">{t('contact.faqTag')}</p>
          <h2 className="font-display text-2xl font-bold text-white mb-8">{t('contact.faqTitle')}</h2>
        </AnimSection>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map(({ q, a }, i) => (
            <AnimSection key={q} delay={i * 60}>
              <div className="border border-[#1E2448] rounded-2xl p-5 bg-[#111428]/80">
                <p className="text-white text-sm font-semibold mb-2">{q}</p>
                <p className="text-[#7A82A8] text-sm leading-relaxed">{a}</p>
              </div>
            </AnimSection>
          ))}
        </div>
      </div>
    </main>
  );
}
