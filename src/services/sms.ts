
'use server';

interface SendSmsParams {
  recipient: string;
  message: string;
}

// Function to format the phone number correctly for Sendexa
const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, ''); // Remove non-digit characters
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
  }
  return cleaned;
};

export async function sendSms({ recipient, message }: SendSmsParams): Promise<{ success: boolean; error?: string }> {
  const token = process.env.SENDEXA_BASIC_TOKEN;
  const senderId = process.env.SENDEXA_SENDER_ID;
  const apiUrl = "https://api.sendexa.co/v1/sms/send";

  if (!token || !senderId) {
    console.error('Sendexa credentials (token or sender ID) are not configured.');
    return { success: false, error: 'SMS service is not configured.' };
  }

  const formattedRecipient = formatPhoneNumber(recipient);

  const payload = {
    recipient: formattedRecipient,
    sender: senderId,
    message: message,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Sendexa API Error:', responseData);
      throw new Error(responseData.message || `API Error: Status ${response.status}`);
    }

    console.log('SMS sent successfully via Sendexa:', responseData);
    return { success: true };

  } catch (error: any) {
    console.error('Failed to send SMS via Sendexa:', error);
    return { success: false, error: error.message };
  }
}
