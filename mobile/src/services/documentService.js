import { Alert } from 'react-native';

class DocumentService {
  async generatePdf(recording) {
    Alert.alert('Not Implemented', 'PDF generation is not yet available on mobile.');
  }

  async generateTxt(recording) {
    Alert.alert('Not Implemented', 'TXT generation is not yet available on mobile.');
  }

  async generateDocx(recording) {
    Alert.alert('Not Implemented', 'DOCX generation is not yet available on mobile.');
  }

  async shareData(recording) {
    Alert.alert('Not Implemented', 'Sharing is not yet available on mobile.');
  }
}

export default new DocumentService();
