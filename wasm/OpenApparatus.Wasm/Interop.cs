using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using OpenApparatus;
using OpenApparatus.Topology;
using OpenApparatus.Topology.Assigners;
using OpenApparatus.Topology.Generators;

namespace OpenApparatus.Wasm;

public static partial class Interop
{
    [JSExport]
    public static string GenerateRoomsJson(
        int seed,
        int floorWidthCells,
        int floorLengthCells,
        int rectangleRoomCount,
        float tileSize)
    {
        var rng = new SeededRandom(seed);

        var generator = new GridDominoGenerator
        {
            FloorWidthCells = floorWidthCells,
            FloorLengthCells = floorLengthCells,
            RectangleRoomCount = rectangleRoomCount,
            TileSize = tileSize,
        };

        var env = generator.Generate(rng);

        var assigner = new SpanningTreePassageAssigner();
        assigner.Assign(env, rng);

        var bounds = env.GetWorldBounds();
        var rooms = new RoomDto[env.Rooms.Count];
        for (int i = 0; i < env.Rooms.Count; i++)
        {
            var r = env.Rooms[i];
            var b = r.GetWorldBounds();
            rooms[i] = new RoomDto(
                r.Id,
                r.RoomType.ToString(),
                b.Min.X,
                b.Min.Y,
                b.Max.X - b.Min.X,
                b.Max.Y - b.Min.Y);
        }

        var doors = new List<DoorDto>();
        foreach (var adj in env.Adjacencies)
        {
            if (adj.Passage is not Passage.Doorway) continue;
            doors.Add(new DoorDto(
                adj.RoomA?.Id ?? -1,
                adj.RoomB?.Id ?? -1,
                adj.SharedSegment.Start.X,
                adj.SharedSegment.Start.Y,
                adj.SharedSegment.End.X,
                adj.SharedSegment.End.Y));
        }

        var payload = new EnvelopeDto(
            seed,
            bounds.Min.X, bounds.Min.Y, bounds.Max.X, bounds.Max.Y,
            rooms,
            doors.ToArray());

        return JsonSerializer.Serialize(payload, InteropJsonContext.Default.EnvelopeDto);
    }
}

internal sealed record RoomDto(int Id, string Type, float X, float Z, float W, float D);
internal sealed record DoorDto(int RoomA, int RoomB, float X1, float Z1, float X2, float Z2);
internal sealed record EnvelopeDto(
    int Seed,
    float MinX, float MinZ, float MaxX, float MaxZ,
    RoomDto[] Rooms,
    DoorDto[] Doors);

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    GenerationMode = JsonSourceGenerationMode.Default)]
[JsonSerializable(typeof(EnvelopeDto))]
internal partial class InteropJsonContext : JsonSerializerContext;
