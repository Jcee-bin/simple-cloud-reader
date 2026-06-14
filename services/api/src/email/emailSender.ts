export interface EmailSender {
  sendMagicLink(input: {
    to: string;
    url: string;
  }): Promise<void>;
}
