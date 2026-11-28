import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceMessageComposer } from '../../components/chat/VoiceMessageComposer';
import { AudioMessageBubble } from '../../components/chat/AudioMessageBubble';

export const MotherConnectScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    mothers,
    healthUpdates,
    messages,
    sendMessage,
    sendVoiceMessage,
    markMessagesAsRead,
    isLoading,
    dbError,
  } = useData();
  const { t, formatName, localize } = useLanguage();
  const activeMotherId =
    user?.role === 'mother' ? user.mcpId || user.id || 'MCP-2026-0894' : 'MCP-2026-0894';
  const mother = mothers.find((m) => m.id === activeMotherId) || null;
  const priyaUpdates = mother ? healthUpdates.filter((u) => u.motherId === mother.id) : [];
  const [inputText, setInputText] = useState('');
  const [callbackRequested, setCallbackRequested] = useState(false);

  const canonicalConvId = mother
    ? `conv_${mother.id}_${mother.assignedWorkerId || 'HW-44120'}`
    : '';
  const threadMessages = mother
    ? messages.filter(
        (m) =>
          m.conversationId === canonicalConvId ||
          ((m.motherId === mother.id || m.senderId === mother.id) &&
            (!m.workerId || !mother.assignedWorkerId || m.workerId === mother.assignedWorkerId))
      )
    : [];
  const unreadWorkerCount = threadMessages.filter(
    (m) => m.senderRole === 'worker' && !m.read
  ).length;

  useEffect(() => {
    if (mother?.id && unreadWorkerCount > 0) {
      markMessagesAsRead(mother.id, 'mother', mother.assignedWorkerId);
    }
  }, [mother?.id, mother?.assignedWorkerId, unreadWorkerCount, markMessagesAsRead]);

  const suggestedQueries = [
    { key: 'queryDietNutrition', text: t('queryDietNutrition') },
    { key: 'queryAppointment', text: t('queryAppointment') },
    { key: 'queryMedication', text: t('queryMedication') },
    { key: 'queryFetalMovements', text: t('queryFetalMovements') },
  ];

  const handleSendText = async (meta: {
    text: string;
    sourceLanguage: 'en' | 'hi' | 'or';
  }) => {
    if (!mother || !meta.text.trim()) return;
    await sendMessage(meta.text.trim(), 'mother', mother.id, mother.name, mother.id, {
      sourceLanguage: meta.sourceLanguage,
      receiverId: mother.assignedWorkerId,
      workerId: mother.assignedWorkerId,
    });
    setInputText('');
  };

  const handleSendVoice = async (params: {
    blob: Blob;
    mimeType: string;
    durationSeconds: number;
    onProgress: (percent: number) => void;
  }) => {
    if (!mother) return;
    await sendVoiceMessage({
      audioBlob: params.blob,
      mimeType: params.mimeType,
      durationSeconds: params.durationSeconds,
      senderRole: 'mother',
      senderId: mother.id,
      senderName: mother.name,
      motherId: mother.id,
      workerId: mother.assignedWorkerId,
      receiverId: mother.assignedWorkerId,
      onProgress: params.onProgress,
    });
  };

  const handleQuickSend = (queryText: string) => {
    setInputText(queryText);
  };

  if (!mother) {
    return (
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/40 text-center space-y-2">
        <p className="font-serif text-base text-primary">
          {isLoading ? localize('Loading care connection...') : localize('Maternal record unavailable')}
        </p>
        {dbError && <p className="text-xs text-error">{dbError}</p>}
      </div>
    );
  }

  const workerInitials = (mother.assignedWorkerName || 'HW')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col w-full space-y-space-xl pb-6">
      {/* 1. Header Greeting */}
      <section className="flex flex-col pt-space-xs">
        <h1 className="font-serif text-2xl text-primary font-normal tracking-tight">
          {t('navConnect')}
        </h1>
        <p className="font-sans text-sm text-secondary mt-1">
          {t('reportSubtitle')}
        </p>
      </section>

      {/* 2. Health Worker Assigned Card */}
      <section className="bg-surface-container rounded-xl p-space-lg border border-outline-variant/40 shadow-sm flex flex-col space-y-space-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0 text-primary-container font-serif font-bold text-lg">
              {workerInitials}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-sans text-base font-bold text-on-surface">
                  {formatName(mother.assignedWorkerName)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  {t('statusActive')}
                </span>
              </div>
              <span className="font-sans text-xs text-secondary">
                {t('yourHealthWorker')}
              </span>
              <span className="font-sans text-xs text-secondary">
                {formatName(mother.village)}, {formatName(mother.hamlet)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          <a
            href="#chat-section"
            className="min-h-[44px] rounded-lg bg-primary-container text-on-primary font-sans text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>{t('sendMessageButton')}</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setCallbackRequested(true);
              setTimeout(() => setCallbackRequested(false), 3000);
            }}
            className="min-h-[44px] rounded-lg bg-surface-container-highest border border-outline-variant text-on-surface font-sans text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            <span>{callbackRequested ? t('callbackQueued') : t('requestCallback')}</span>
          </button>
        </div>

        {callbackRequested && (
          <div className="p-2.5 rounded-lg bg-primary-container/10 border border-primary-container/30 text-xs text-primary-container text-center font-medium">
            {t('callbackSentNotice', { name: formatName(mother.assignedWorkerName) })}
          </div>
        )}
      </section>

      {/* 3. Recent Health Updates & Review Status */}
      <section className="flex flex-col space-y-space-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[20px]">fact_check</span>
          <h2 className="font-serif text-lg font-bold text-primary">{t('recentHealthUpdates')}</h2>
        </div>

        <div className="space-y-space-sm">
          {priyaUpdates.map((item) => (
            <div
              key={item.healthUpdateId}
              className="bg-surface-container rounded-xl p-space-md border border-outline-variant/40 shadow-sm flex flex-col space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-on-surface">
                  {item.submittedAt}
                </span>
                {item.reviewStatus === 'reviewed' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    {t('statusReviewed')}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                    {t('statusPending')}
                  </span>
                )}
              </div>

              <p className="font-sans text-xs text-on-surface">
                <strong className="text-secondary font-medium">{t('clinicalNotes')}:</strong> {localize(item.observations, item.translations?.observations)}
              </p>

              {item.reviewNotes && (
                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs text-tertiary">
                  <span className="font-semibold text-primary block mb-0.5">{formatName(mother.assignedWorkerName)}:</span>
                  <p className="italic font-serif">"{localize(item.reviewNotes, item.translations?.reviewNotes)}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recent Messages Section */}
      <section id="chat-section" className="flex flex-col space-y-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">chat_bubble</span>
            <h2 className="font-serif text-lg font-bold text-primary">{t('askHealthWorker')}</h2>
          </div>
          <span className="font-sans text-[11px] text-secondary">{t('statusActive')}</span>
        </div>

        {/* Message Thread */}
        <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/40 shadow-sm space-y-3">
          {threadMessages.map((msg) => {
            const isMe = msg.senderRole === 'mother';
            const isAudio = msg.type === 'audio' || !!msg.audioStoragePath || !!msg.audioDownloadUrl;
            const isPending = msg.syncStatus === 'pending_sync' || (msg as any).syncState === 'pending_sync';
            const isFailed = msg.syncStatus === 'failed' || (msg as any).syncState === 'conflict';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-secondary mb-0.5 px-1">
                  {isMe ? `${t('roleMother')} (${formatName(mother.name)})` : `${formatName(mother.assignedWorkerName)} (${t('roleWorker')})`}
                </span>
                {isAudio ? (
                  <AudioMessageBubble message={msg} isMe={isMe} />
                ) : (
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-primary-container text-on-primary rounded-br-none shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface rounded-bl-none border border-outline-variant/40'
                    }`}
                  >
                    {localize(msg.text, msg.translations?.text)}
                  </div>
                )}
                <div className="text-[10px] text-secondary mt-0.5 px-1 flex items-center gap-1.5">
                  {isFailed ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-900 border border-red-300 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">error</span>
                      Sync Failed
                    </span>
                  ) : !isPending ? (
                    <span
                      className={`material-symbols-outlined text-[12px] ${
                        msg.read ? 'text-emerald-600' : 'text-secondary/75'
                      }`}
                      title={msg.read ? 'Read' : 'Delivered'}
                    >
                      {msg.delivered || msg.read ? 'done_all' : 'done'}
                    </span>
                  ) : null}
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Suggested Inquiries */}
          <div className="pt-2">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-secondary block mb-1.5">
              {t('suggestedInquiries')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQueries.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => handleQuickSend(q.text)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-surface-container-high text-on-surface border border-outline-variant/40 hover:border-primary-container cursor-pointer"
                >
                  {q.text}
                </button>
              ))}
            </div>
          </div>

          {/* Composer Input (Text + Direct Voice Message) */}
          <div className="pt-2">
            <VoiceMessageComposer
              value={inputText}
              onChange={setInputText}
              onSendText={handleSendText}
              onSendVoice={handleSendVoice}
              placeholder={t('typeMessagePlaceholder')}
              sendAriaLabel={t('sendMessageButton')}
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 text-[11px] text-secondary flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary-container shrink-0 mt-0.5">verified_user</span>
          <span>
            {t('confidentialNotice')}
          </span>
        </div>
      </section>
    </div>
  );
};
