import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';

interface SignatureCanvasProps {
  onOK: (signatureBase64: string) => void;
  onClear: () => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onOK, onClear }) => {
  const [hasSigned, setHasSigned] = useState(false);

  // Componente simulação touch/mouse canvas para React Native Web/Mobile
  const handleTouch = () => {
    setHasSigned(true);
  };

  const handleSave = () => {
    // Retorna uma string base64 fictícia para representação da assinatura
    const mockSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    onOK(mockSignature);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assinatura Digital do Cliente</Text>
      
      <View style={styles.canvasBox} onTouchStart={handleTouch}>
        <Text style={styles.canvasPlaceholder}>
          {hasSigned ? '✍️ Assinatura Registrada na Tela' : 'Desenhe ou assine com o dedo no espaço acima'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnClear]}
          onPress={() => {
            setHasSigned(false);
            onClear();
          }}
        >
          <Text style={styles.btnTextClear}>Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSave, !hasSigned && styles.btnDisabled]}
          disabled={!hasSigned}
          onPress={handleSave}
        >
          <Text style={styles.btnTextSave}>Confirmar Assinatura</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  canvasBox: {
    height: 120,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  canvasPlaceholder: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnClear: {
    backgroundColor: '#334155',
  },
  btnSave: {
    backgroundColor: '#0284c7',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextClear: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  btnTextSave: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
