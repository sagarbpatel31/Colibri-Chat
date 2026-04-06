export type RootStackParamList = {
  AgeGate: undefined;
  LocationPermission: undefined;
  NearbyRooms: undefined;
  CreateRoom: undefined;
  ChatRoom: { roomId: string; roomName: string };
  ReportModal: { roomId: string; messageId: string; messageText: string; senderAlias: string };
  Settings: undefined;
};
