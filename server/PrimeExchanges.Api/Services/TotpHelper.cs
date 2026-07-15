using System;
using System.Security.Cryptography;
using System.Text;

namespace PrimeExchanges.Api.Services;

public static class TotpHelper
{
    private static readonly string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /// <summary>
    /// Decodes a Base32 encoded string into a byte array.
    /// </summary>
    public static byte[] DecodeBase32(string input)
    {
        input = input.Trim().ToUpperInvariant().Replace("=", "");
        if (string.IsNullOrEmpty(input))
        {
            return Array.Empty<byte>();
        }

        int byteCount = input.Length * 5 / 8;
        byte[] returnArray = new byte[byteCount];

        byte curByte = 0;
        int bitsRemaining = 8;
        int mask;
        int arrayIndex = 0;

        foreach (char c in input)
        {
            int cValue = Base32Alphabet.IndexOf(c);
            if (cValue < 0)
            {
                throw new FormatException("Invalid Base32 character.");
            }

            if (bitsRemaining > 5)
            {
                mask = cValue << (bitsRemaining - 5);
                curByte = (byte)(curByte | mask);
                bitsRemaining -= 5;
            }
            else
            {
                mask = cValue >> (5 - bitsRemaining);
                curByte = (byte)(curByte | mask);
                if (arrayIndex < returnArray.Length)
                {
                    returnArray[arrayIndex++] = curByte;
                }
                curByte = (byte)(cValue << (3 + bitsRemaining));
                bitsRemaining = 8 - (5 - bitsRemaining);
            }
        }
        return returnArray;
    }

    /// <summary>
    /// Generates a random 16-character Base32 secret key.
    /// </summary>
    public static string GenerateSecret()
    {
        var bytes = new byte[10]; // 80 bits is enough for TOTP
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        var sb = new StringBuilder(16);
        for (int i = 0; i < bytes.Length * 8; i += 5)
        {
            int index = 0;
            for (int j = 0; j < 5; j++)
            {
                int bitIndex = i + j;
                int byteIndex = bitIndex / 8;
                int bitOffset = 7 - (bitIndex % 8);
                if (byteIndex < bytes.Length)
                {
                    int bit = (bytes[byteIndex] >> bitOffset) & 1;
                    index = (index << 1) | bit;
                }
            }
            sb.Append(Base32Alphabet[index]);
        }
        return sb.ToString();
    }

    /// <summary>
    /// Verifies a 6-digit TOTP code against a Base32 encoded secret.
    /// </summary>
    public static bool VerifyCode(string secret, string code, int windowSeconds = 30)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(code))
        {
            return false;
        }

        code = code.Trim();
        if (code.Length != 6 || !int.TryParse(code, out int codeInt))
        {
            return false;
        }

        byte[] key;
        try
        {
            key = DecodeBase32(secret);
        }
        catch
        {
            return false;
        }

        long counter = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;
        int steps = windowSeconds / 30;

        for (int i = -steps; i <= steps; i++)
        {
            if (GenerateCode(key, counter + i) == codeInt)
            {
                return true;
            }
        }

        return false;
    }

    private static int GenerateCode(byte[] key, long counter)
    {
        byte[] counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(counterBytes);
        }

        using var hmac = new HMACSHA1(key);
        byte[] hash = hmac.ComputeHash(counterBytes);

        int offset = hash[hash.Length - 1] & 0xf;
        int binary = ((hash[offset] & 0x7f) << 24)
                   | ((hash[offset + 1] & 0xff) << 16)
                   | ((hash[offset + 2] & 0xff) << 8)
                   | (hash[offset + 3] & 0xff);

        return binary % 1000000;
    }
}
