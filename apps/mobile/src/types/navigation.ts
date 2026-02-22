export type RootStackParamList = {
  LocationPermission: undefined;
  NearbyRooms: undefined;
  ChatRoom: { roomId: string; roomName: string };
  ReportModal: { roomId: string; messageId: string; messageText: string; senderAlias: string };
  Settings: undefined;
};
