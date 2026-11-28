// Offers short text and voice conversations in English or Hindi.
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart' as speech;
import '../services/zedtron_service.dart';
import '../widgets/cyber_background.dart';

class _ChatMessage {
  const _ChatMessage(this.text, {required this.fromAssistant});
  final String text;
  final bool fromAssistant;
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _speech = speech.SpeechToText();
  final _tts = FlutterTts();
  final List<_ChatMessage> _messages = [
    const _ChatMessage(
      'Hi, I am here with you. What would feel helpful to talk about?',
      fromAssistant: true,
    ),
  ];
  String _language = 'en';
  bool _listening = false;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _speech.stop();
    _tts.stop();
    super.dispose();
  }

  Future<void> _send([String? transcript]) async {
    final text = (transcript ?? _input.text).trim();
    if (text.isEmpty || _sending) return;
    final effectiveLanguage =
        RegExp(r'[\u0900-\u097F]').hasMatch(text) ? 'hi' : _language;
    setState(() {
      _messages.add(_ChatMessage(text, fromAssistant: false));
      _input.clear();
      _sending = true;
      _error = null;
      _language = effectiveLanguage;
    });
    try {
      final reply =
          await ZedtronService.reply(text, language: effectiveLanguage);
      if (!mounted) return;
      setState(() => _messages.add(_ChatMessage(reply, fromAssistant: true)));
      await _speak(reply);
      _scrollToBottom();
    } catch (error) {
      if (mounted) setState(() => _error = 'Zedtron is unavailable: $error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _listen() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }
    try {
      final available = await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' && mounted) setState(() => _listening = false);
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _listening = false;
              _error = 'Voice input failed: ${error.errorMsg}';
            });
          }
        },
      );
      if (!available) {
        setState(() => _error = 'Speech recognition is not available on this device.');
        return;
      }
      setState(() {
        _listening = true;
        _error = null;
      });
      await _speech.listen(
        listenOptions: speech.SpeechListenOptions(
          localeId: _language == 'hi' ? 'hi_IN' : 'en_US',
          cancelOnError: true,
        ),
        onResult: (result) {
          if (!mounted) return;
          _input.text = result.recognizedWords;
          if (result.finalResult && _input.text.isNotEmpty) _send();
        },
      );
    } catch (error) {
      if (mounted) setState(() => _error = 'Voice input failed: $error');
    }
  }

  Future<void> _speak(String text) async {
    try {
      await _tts.setLanguage(_language == 'hi' ? 'hi-IN' : 'en-US');
      await _tts.setSpeechRate(.45);
      await _tts.speak(text);
    } catch (error) {
      if (mounted) setState(() => _error = 'Voice reply unavailable: $error');
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Zedtron'),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 10),
              child: DropdownButton<String>(
                value: _language,
                underline: const SizedBox.shrink(),
                items: const [
                  DropdownMenuItem(value: 'en', child: Text('EN')),
                  DropdownMenuItem(value: 'hi', child: Text('हिंदी')),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _language = value);
                },
              ),
            ),
          ],
        ),
        body: CyberBackground(
          child: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return Align(
                        alignment: message.fromAssistant
                            ? Alignment.centerLeft
                            : Alignment.centerRight,
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 310),
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: message.fromAssistant
                                ? const Color(0xff10263a)
                                : const Color(0xff13516a),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Text(message.text,
                              style: const TextStyle(height: 1.4)),
                        ),
                      );
                    },
                  ),
                ),
                if (_sending) const LinearProgressIndicator(),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(_error!,
                        style: const TextStyle(color: Colors.orangeAccent)),
                  ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Text(
                    'If you are in danger, press SOS or call 112. '
                    'Zedtron is supportive, not a medical or legal service.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white54, fontSize: 11),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: _listen,
                          icon: Icon(_listening ? Icons.stop : Icons.mic),
                          color: _listening
                              ? Colors.redAccent
                              : const Color(0xff6edfff),
                          tooltip: _listening ? 'Stop voice input' : 'Speak',
                        ),
                        Expanded(
                          child: TextField(
                            controller: _input,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            decoration: const InputDecoration(
                              hintText: 'Type a message…',
                              border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.all(Radius.circular(22)),
                              ),
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: _sending ? null : () => _send(),
                          icon: const Icon(Icons.send_rounded),
                          color: const Color(0xff6edfff),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
