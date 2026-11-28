// Calls the secured callable backend or provides a small offline safety response.
import 'package:cloud_functions/cloud_functions.dart';
import 'auth_service.dart';

class ZedtronService {
  static Future<String> reply(String message, {required String language}) async {
    if (AuthService.firebaseEnabled) {
      final result = await FirebaseFunctions.instance
          .httpsCallable('zedtronChat')
          .call<Map<String, dynamic>>({
        'message': message,
        'language': language,
      });
      final answer = result.data['reply'];
      if (answer is! String || answer.trim().isEmpty) {
        throw StateError('The assistant returned an empty reply.');
      }
      return answer;
    }
    final lower = message.toLowerCase();
    if (lower.contains('unsafe') ||
        lower.contains('danger') ||
        lower.contains('follow') ||
        lower.contains('खतरा')) {
      return language == 'hi'
          ? 'अगर आप अभी खतरे में हैं, SOS दबाएँ या 112 पर कॉल करें। किसी सुरक्षित, लोगों वाली जगह जाएँ।'
          : 'If you are in danger right now, tap SOS or call 112. Move to a safer place with other people.';
    }
    if (lower.contains('sad') ||
        lower.contains('low') ||
        lower.contains('उदास')) {
      return language == 'hi'
          ? 'मुझे दुख है कि आप ऐसा महसूस कर रही हैं। किसी भरोसेमंद व्यक्ति से बात करना मददगार हो सकता है।'
          : 'I am sorry this feels heavy. Talking with someone you trust may help. You deserve support.';
    }
    return language == 'hi'
        ? 'मैं आपकी बात सुन रही हूँ। अभी आपके लिए सबसे छोटी, मददगार बात क्या हो सकती है?'
        : 'I am here with you. What is one small thing that might help you feel a little steadier?';
  }
}
