using System.Text.Json;
using System.Text.Json.Serialization;
using FortniteReplayReader;
using Unreal.Core.Models.Enums;

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: SniperHunterParser.exe <input.replay>");
    return 1;
}

var replay = new ReplayReader(parseMode: ParseMode.Full).ReadReplay(args[0]);
var trackedPlayers = replay.PlayerData.Count(player => player.Locations.Count > 0);
Console.Error.WriteLine($"Movement tracks: {trackedPlayers} player(s).");
var options = new JsonSerializerOptions
{
    WriteIndented = false,
    MaxDepth = 256,
    ReferenceHandler = ReferenceHandler.IgnoreCycles,
    NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
};
const string temporary = "replay.json.tmp";
await using (var output = File.Create(temporary))
{
    await JsonSerializer.SerializeAsync(output, replay, options);
}
File.Move(temporary, "replay.json", overwrite: true);
return 0;
