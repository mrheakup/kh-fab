'================ KH_GEOM — геометр (Inventor-оос хамааралгүй). KH Fab templates.js-тэй 1:1 ================
Public Class KV
    Public X As Double, Y As Double, B As Double
    Public Sub New(x As Double, y As Double, b As Double)
        Me.X = x : Me.Y = y : Me.B = b
    End Sub
End Class

Public Class KFrame
    Public O(2) As Double, U(2) As Double, V(2) As Double, N(2) As Double
End Class

Public Class KSolid
    Public Loops As New List(Of List(Of KV))
    Public T As Double
    Public Fr As KFrame
End Class

Public Class KPart
    Public Key As String, Name As String, Qty As Integer, Thk As Double
    Public Solids As New List(Of KSolid)
End Class

Public Class KPlace
    Public Key As String
    Public Fr As KFrame
End Class

Public Class KModel
    Public Parts As New List(Of KPart)
    Public Places As New List(Of KPlace)
    Public Function Part(key As String) As KPart
        For Each p As KPart In Parts
            If p.Key = key Then Return p
        Next
        Return Nothing
    End Function
    Public Function Add(key As String, name As String, qty As Integer, thk As Double, solids As List(Of KSolid)) As KPart
        Dim p As New KPart
        p.Key = key : p.Name = name : p.Qty = qty : p.Thk = thk : p.Solids = solids
        Parts.Add(p)
        Return p
    End Function
    Public Sub Place(key As String, fr As KFrame)
        Dim q As New KPlace
        q.Key = key : q.Fr = fr
        Places.Add(q)
    End Sub
End Class

Public Class KG
    Public Shared ReadOnly BQ As Double = Math.Tan(Math.PI / 8)

    Public Shared Function Fr(o() As Double, u() As Double, v() As Double) As KFrame
        Dim f As New KFrame
        For i As Integer = 0 To 2
            f.O(i) = o(i) : f.U(i) = u(i) : f.V(i) = v(i)
        Next
        f.N(0) = u(1) * v(2) - u(2) * v(1)
        f.N(1) = u(2) * v(0) - u(0) * v(2)
        f.N(2) = u(0) * v(1) - u(1) * v(0)
        Return f
    End Function
    Public Shared Function A3(x As Double, y As Double, z As Double) As Double()
        Return New Double() {x, y, z}
    End Function
    Public Shared Function FrXY(x As Double, y As Double, z As Double) As KFrame
        Return Fr(A3(x, y, z), A3(1, 0, 0), A3(0, 1, 0))
    End Function
    Public Shared Function RotZ(x As Double, y As Double, z As Double, deg As Double) As KFrame
        Dim a As Double = deg * Math.PI / 180, c As Double = Math.Cos(a), s As Double = Math.Sin(a)
        Return Fr(A3(x, y, z), A3(c, s, 0), A3(-s, c, 0))
    End Function
    Public Shared Function FrRaw(o() As Double, u() As Double, v() As Double, n() As Double) As KFrame
        Dim f As New KFrame
        For i As Integer = 0 To 2
            f.O(i) = o(i) : f.U(i) = u(i) : f.V(i) = v(i) : f.N(i) = n(i)
        Next
        Return f
    End Function
    ' point o + x·u + y·v + z·n
    Public Shared Function At(f As KFrame, x As Double, y As Double, z As Double) As Double()
        Dim r(2) As Double
        For i As Integer = 0 To 2
            r(i) = f.O(i) + x * f.U(i) + y * f.V(i) + z * f.N(i)
        Next
        Return r
    End Function

    Public Shared Function Rc(x As Double, y As Double, w As Double, h As Double, r As Double) As List(Of KV)
        Dim L As New List(Of KV)
        Dim R0 As Double = Math.Max(0, Math.Min(r, Math.Min(w / 2 - 0.000001, h / 2 - 0.000001)))
        If R0 <= 0.001 Then
            L.Add(New KV(x, y, 0)) : L.Add(New KV(x + w, y, 0)) : L.Add(New KV(x + w, y + h, 0)) : L.Add(New KV(x, y + h, 0))
        Else
            L.Add(New KV(x + R0, y, 0)) : L.Add(New KV(x + w - R0, y, BQ)) : L.Add(New KV(x + w, y + R0, 0)) : L.Add(New KV(x + w, y + h - R0, BQ))
            L.Add(New KV(x + w - R0, y + h, 0)) : L.Add(New KV(x + R0, y + h, BQ)) : L.Add(New KV(x, y + h - R0, 0)) : L.Add(New KV(x, y + R0, BQ))
        End If
        Return L
    End Function
    Public Shared Function Ci(cx As Double, cy As Double, r As Double) As List(Of KV)
        Dim L As New List(Of KV)
        L.Add(New KV(cx + r, cy, 1)) : L.Add(New KV(cx - r, cy, 1))
        Return L
    End Function
    Public Shared Function Sl(cx As Double, cy As Double, len As Double, w As Double, vert As Boolean) As List(Of KV)
        Dim r As Double = w / 2, l As Double = Math.Max(0, len - w)
        If l < 0.000001 Then Return Ci(cx, cy, r)
        Dim L2 As New List(Of KV)
        If Not vert Then
            L2.Add(New KV(cx - l / 2, cy - r, 0)) : L2.Add(New KV(cx + l / 2, cy - r, 1)) : L2.Add(New KV(cx + l / 2, cy + r, 0)) : L2.Add(New KV(cx - l / 2, cy + r, 1))
        Else
            L2.Add(New KV(cx + r, cy - l / 2, 0)) : L2.Add(New KV(cx + r, cy + l / 2, 1)) : L2.Add(New KV(cx - r, cy + l / 2, 0)) : L2.Add(New KV(cx - r, cy - l / 2, 1))
        End If
        Return L2
    End Function
    ' triples x, y, bulge
    Public Shared Function Pl(ParamArray d() As Double) As List(Of KV)
        Dim L As New List(Of KV)
        For i As Integer = 0 To d.Length - 3 Step 3
            L.Add(New KV(d(i), d(i + 1), d(i + 2)))
        Next
        Return L
    End Function
    Public Shared Function Sol(t As Double, fr As KFrame, ParamArray loops() As List(Of KV)) As KSolid
        Dim s As New KSolid
        s.T = t : s.Fr = fr
        For Each l As List(Of KV) In loops
            s.Loops.Add(l)
        Next
        Return s
    End Function
    Public Shared Function SolL(t As Double, fr As KFrame, loops As List(Of List(Of KV))) As KSolid
        Dim s As New KSolid
        s.T = t : s.Fr = fr : s.Loops = loops
        Return s
    End Function
    Public Shared Function Box(x As Double, y As Double, z As Double, dx As Double, dy As Double, dz As Double) As KSolid
        Return Sol(dz, FrXY(x, y, z), Rc(0, 0, dx, dy, 0))
    End Function
    Public Shared Function One(s As KSolid) As List(Of KSolid)
        Dim L As New List(Of KSolid)
        L.Add(s)
        Return L
    End Function

    ' DIN 6935 neutral axis
    Public Shared Function KFactor(R As Double, t As Double) As Double
        Dim k As Double = Math.Min(1, Math.Max(0.5, 0.65 + 0.5 * Math.Log10(Math.Max(R, 0.01) / t)))
        Return k / 2
    End Function

    ' flanged tray: panel on top at z = F, flanges hang to z = 0; sides s0 (y=0), s1 (x=W), s2 (y=D), s3 (x=0)
    Public Shared Function Tray3D(W As Double, D As Double, F As Double, t As Double, s0 As Boolean, s1 As Boolean, s2 As Boolean, s3 As Boolean, holes As List(Of List(Of KV))) As List(Of KSolid)
        Dim out As New List(Of KSolid)
        Dim lp As New List(Of List(Of KV))
        lp.Add(Rc(0, 0, W, D, 0))
        If holes IsNot Nothing Then lp.AddRange(holes)
        out.Add(SolL(t, FrXY(0, 0, F - t), lp))
        Dim y0 As Double = If(s0, t, 0), y1 As Double = If(s2, D - t, D), h As Double = F - t
        If s0 Then out.Add(Box(0, 0, 0, W, t, h))
        If s2 Then out.Add(Box(0, D - t, 0, W, t, h))
        If s3 Then out.Add(Box(0, y0, 0, t, y1 - y0, h))
        If s1 Then out.Add(Box(W - t, y0, 0, t, y1 - y0, h))
        Return out
    End Function
    Public Shared Function Angle3D(A As Double, B As Double, len As Double, t As Double) As List(Of KSolid)
        Dim out As New List(Of KSolid)
        out.Add(Box(0, 0, 0, A, t, len))
        out.Add(Box(0, t, 0, t, B - t, len))
        Return out
    End Function
    Private Shared Function Rnd0(v As Double) As Double
        Return Math.Round(v, MidpointRounding.AwayFromZero)
    End Function

    '-------------------------------- templates --------------------------------
    Public Shared Function Pegboard(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim W As Double = p("W"), H As Double = p("H"), t As Double = p("t"), F As Double = p("F"), pt As Double = p("p")
        Dim hw As Double = p("hw"), hl As Double = p("hl"), mg As Double = p("m"), md As Double = p("md")
        Dim nx As Integer = Math.Max(1, CInt(Math.Floor((W - 2 * mg) / pt)) + 1)
        Dim ny As Integer = Math.Max(1, CInt(Math.Floor((H - 2 * mg - (hl - hw)) / pt)) + 1)
        Dim x0 As Double = (W - (nx - 1) * pt) / 2, y0 As Double = (H - (ny - 1) * pt) / 2
        Dim holes As New List(Of List(Of KV))
        For i As Integer = 0 To nx - 1
            For j As Integer = 0 To ny - 1
                holes.Add(Sl(x0 + i * pt, y0 + j * pt, hl, hw, True))
            Next
        Next
        holes.Add(Ci(mg / 2, mg / 2, md / 2)) : holes.Add(Ci(W - mg / 2, mg / 2, md / 2)) : holes.Add(Ci(W - mg / 2, H - mg / 2, md / 2)) : holes.Add(Ci(mg / 2, H - mg / 2, md / 2))
        Dim n As Integer = CInt(Rnd0(p("n")))
        m.Add("board", "Pegboard " & W & "x" & H, n, t, Tray3D(W, H, F, t, True, True, True, True, holes))
        For i As Integer = 0 To n - 1
            m.Place("board", Fr(A3(i * (W + 20), 0, 0), A3(1, 0, 0), A3(0, 0, 1)))
        Next
        Return m
    End Function

    Public Shared Function Bench(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim L As Double = p("L"), D As Double = p("D"), H As Double = p("H"), t As Double = p("t"), F As Double = p("F")
        Dim A As Double = p("A"), tl As Double = p("tl"), zs As Double = p("zs"), ts As Double = p("ts"), Fs As Double = p("Fs")
        Dim SL As Double = L - 2 * t - 2 * tl, SD As Double = D - 2 * t - 2 * tl, Lg As Double = H - t
        m.Add("top", "Tavtsan " & L & "x" & D, 1, t, Tray3D(L, D, F, t, True, True, True, True, Nothing))
        m.Add("shelf", "Dood taviur", 1, ts, Tray3D(SL, SD, Fs, ts, True, True, True, True, Nothing))
        m.Add("leg", "Khol " & A & "x" & A & "x" & tl, 4, tl, Angle3D(A, A, Lg, tl))
        m.Place("top", FrXY(0, 0, H - F))
        m.Place("shelf", FrXY(t + tl, t + tl, zs - Fs))
        m.Place("leg", RotZ(t, t, 0, 0)) : m.Place("leg", RotZ(L - t, t, 0, 90)) : m.Place("leg", RotZ(L - t, D - t, 0, 180)) : m.Place("leg", RotZ(t, D - t, 0, 270))
        Return m
    End Function

    Public Shared Function Chair(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim Ws As Double = p("Ws"), Ds As Double = p("Ds"), Hs As Double = p("Hs"), Hb As Double = p("Hb"), pw As Double = p("pw")
        Dim tf As Double = p("tf"), t As Double = p("t"), F As Double = p("F"), Hbp As Double = p("Hbp"), r As Double = p("bd") / 2
        Dim a As Double = p("a") * Math.PI / 180, ta As Double = Math.Tan(a), ca As Double = Math.Cos(a), sa As Double = Math.Sin(a)
        Dim Gx As Double = pw - Hs * ta
        Dim side As List(Of KV) = Pl(0, 0, 0, Ds, 0, 0, Ds, Hs, 0, Gx, Hs, 0, pw - Hb * ta, Hb, 0.35, -Hb * ta, Hb, 0)
        Dim cut As List(Of KV) = Rc(pw + 30, 60, Math.Max(20, Ds - pw - 70), Math.Max(20, Hs - 120), 20)
        Dim Dp As Double = Rnd0(Ds - Math.Max(Gx, pw) - 5)
        Dim sFr As KFrame = FrXY(0, Ds - Dp, Hs - F)
        Dim y0 As Double = Hb - 20 - Hbp
        Dim nB() As Double = A3(0, ca, sa)
        Dim P0() As Double = A3(Ws, pw - y0 * ta, y0)
        Dim bFr As KFrame = FrRaw(A3(P0(0) - F * nB(0), P0(1) - F * nB(1), P0(2) - F * nB(2)), A3(-1, 0, 0), A3(0, -sa, ca), nB)
        Dim lps As New List(Of List(Of KV))
        lps.Add(side) : lps.Add(cut)
        For Each fq As Double In New Double() {0.25, 0.75}
            Dim w() As Double = At(sFr, 0, fq * Dp, F / 2)
            lps.Add(Ci(w(1), w(2), r))
            Dim q() As Double = At(bFr, 0, fq * Hbp, F / 2)
            lps.Add(Ci(q(1), q(2), r))
        Next
        Dim n As Integer = CInt(Rnd0(p("n")))
        m.Add("side", "Khajuu khuree", 2 * n, tf, One(SolL(tf, Fr(A3(0, 0, 0), A3(0, 1, 0), A3(0, 0, 1)), lps)))
        m.Add("seat", "Suudal", n, t, Tray3D(Ws, Dp, F, t, False, True, False, True, Nothing))
        m.Add("back", "Tushleg", n, t, Tray3D(Ws, Hbp, F, t, False, True, False, True, Nothing))
        For i As Integer = 0 To n - 1
            Dim dx As Double = i * (Ws + 2 * tf + 150)
            m.Place("side", FrXY(dx - tf, 0, 0)) : m.Place("side", FrXY(dx + Ws, 0, 0))
            m.Place("seat", FrXY(dx, Ds - Dp, Hs - F))
            m.Place("back", FrRaw(A3(bFr.O(0) + dx, bFr.O(1), bFr.O(2)), bFr.U, bFr.V, bFr.N))
        Next
        Return m
    End Function

    Public Shared Function Rack(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim L As Double = p("L"), D As Double = p("D"), H As Double = p("H"), ts As Double = p("ts"), F As Double = p("F")
        Dim A As Double = p("A"), tl As Double = p("tl"), pt As Double = p("pt")
        Dim SL As Double = L - 2 * tl, SD As Double = D - 2 * tl
        Dim rows As New List(Of Double)
        Dim y As Double = pt / 2
        While y < H - pt / 4
            rows.Add(y) : y += pt
        End While
        Dim k As Integer = Math.Max(1, CInt(Rnd0(p("k"))))
        Dim lv As New List(Of Double)
        For i As Integer = 0 To k - 1
            Dim want As Double = If(k = 1, H / 2, 120 + i * (H - 120 - F) / (k - 1))
            Dim best As Double = rows(0)
            For Each yy As Double In rows
                If Math.Abs(yy - (want - F / 2)) < Math.Abs(best - (want - F / 2)) Then best = yy
            Next
            lv.Add(best + F / 2)
        Next
        m.Add("shelf", "Taviur", k, ts, Tray3D(SL, SD, F, ts, True, True, True, True, Nothing))
        m.Add("post", "Tulguur " & A & "x" & A & "x" & tl, 4, tl, Angle3D(A, A, H, tl))
        For Each z As Double In lv
            m.Place("shelf", FrXY(tl, tl, z - F))
        Next
        m.Place("post", RotZ(0, 0, 0, 0)) : m.Place("post", RotZ(L, 0, 0, 90)) : m.Place("post", RotZ(L, D, 0, 180)) : m.Place("post", RotZ(0, D, 0, 270))
        Return m
    End Function

    Public Shared Function LBracket(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim A As Double = p("A"), B As Double = p("B"), w As Double = p("w"), t As Double = p("t")
        Dim s As New List(Of KSolid)
        s.Add(Sol(t, FrXY(0, 0, 0), Rc(0, 0, A, w, 0)))
        s.Add(Sol(t, Fr(A3(t, 0, t), A3(0, 0, 1), A3(0, 1, 0)), Rc(0, 0, B - t, w, 0)))
        Dim n As Integer = CInt(Rnd0(p("n")))
        m.Add("br", "L bekhelgee " & A & "x" & B & "x" & w, n, t, s)
        For i As Integer = 0 To n - 1
            m.Place("br", FrXY(i * (A + 40), 0, 0))
        Next
        Return m
    End Function

    Public Shared Function BasePlate(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim L As Double = p("L"), W As Double = p("W"), t As Double = p("t"), e As Double = p("e"), d As Double = p("d")
        Dim nx As Integer = Math.Max(1, CInt(Rnd0(p("nx")))), ny As Integer = Math.Max(1, CInt(Rnd0(p("ny"))))
        Dim lp As New List(Of List(Of KV))
        lp.Add(Rc(0, 0, L, W, p("R")))
        For i As Integer = 0 To nx - 1
            For j As Integer = 0 To ny - 1
                Dim x As Double = If(nx = 1, L / 2, e + i * (L - 2 * e) / (nx - 1))
                Dim y As Double = If(ny = 1, W / 2, e + j * (W - 2 * e) / (ny - 1))
                If nx > 1 AndAlso ny > 1 AndAlso i > 0 AndAlso i < nx - 1 AndAlso j > 0 AndAlso j < ny - 1 Then Continue For
                lp.Add(Ci(x, y, d / 2))
            Next
        Next
        If p("d0") > 0 Then lp.Add(Ci(L / 2, W / 2, p("d0") / 2))
        Dim n As Integer = CInt(Rnd0(p("n")))
        m.Add("bp", "Suuri khavtan " & L & "x" & W & "x" & t, n, t, One(SolL(t, FrXY(0, 0, 0), lp)))
        For i As Integer = 0 To n - 1
            m.Place("bp", FrXY(i * (L + 60), 0, 0))
        Next
        Return m
    End Function

    Public Shared Function Bucket(p As Dictionary(Of String, Double)) As KModel
        Dim m As New KModel
        Dim W As Double = p("W"), D As Double = p("D"), H As Double = p("H"), R As Double = p("R")
        Dim al As Double = Math.Min(60, p("alpha")) * Math.PI / 180
        Dim ts As Double = p("side_t"), tw As Double = p("wrap_t"), tl As Double = p("lip_t"), tt As Double = p("top_t"), te As Double = p("ear_t"), twr As Double = p("wear_t")
        Dim lipL As Double = p("lipL"), topD As Double = p("topD"), Bx As Double = D - H * Math.Tan(al)
        Dim Lm As Double = Math.Sqrt((D - Bx) * (D - Bx) + H * H), Lb As Double = D - lipL - R
        Dim Re As Double = p("pin") / 2 + p("boss"), Pp As Double = p("pitch"), hc As Double = p("hc")
        Dim XZ As KFrame = Fr(A3(0, 0, 0), A3(1, 0, 0), A3(0, 0, 1))
        m.Add("side", "Khajuu khavtan", 2, ts, One(Sol(ts, XZ, Pl(R, 0, 0, D, 0, 0, Bx, H, 0, 0, H, 0, 0, R, BQ))))
        m.Place("side", FrXY(0, 0, 0)) : m.Place("side", FrXY(0, W + ts, 0))
        m.Add("wrap", "Orookh khavtan", 1, tw, One(Sol(W, Fr(A3(0, W, 0), A3(1, 0, 0), A3(0, 0, 1)), Pl(D - lipL, 0, 0, R, 0, -BQ, 0, R, 0, 0, H - tt, 0, tw, H - tt, 0, tw, R, BQ, R, tw, 0, D - lipL, tw, 0))))
        m.Place("wrap", FrXY(0, 0, 0))
        m.Add("lip", "Ir", 1, tl, One(Sol(tl, FrXY(0, 0, 0), Rc(0, 0, lipL, W, 0))))
        m.Place("lip", FrXY(D - lipL, 0, 0))
        m.Add("top", "Deed khavtan", 1, tt, One(Sol(tt, FrXY(0, 0, 0), Rc(0, 0, topD, W, 0))))
        m.Place("top", FrXY(0, 0, H - tt))
        Dim ne As Integer = CInt(Rnd0(p("earQty")))
        If ne > 0 Then
            Dim ear As List(Of KV) = Pl(-Re, 0, 0, Pp + Re, 0, 0, Pp + Re, hc, BQ, Pp, hc + Re, 0, 0, hc + Re, BQ, -Re, hc, 0)
            m.Add("ear", "Chikh", ne, te, One(Sol(te, XZ, ear, Ci(0, hc, p("pin") / 2), Ci(Pp, hc, p("pin") / 2))))
            Dim ex0 As Double = topD / 2 - Pp / 2
            For k As Integer = 0 To ne - 1
                m.Place("ear", FrXY(ex0, W * (k + 1) / (ne + 1) + te / 2, H))
            Next
        End If
        Dim nw As Integer = CInt(Rnd0(p("wearN")))
        If nw > 0 AndAlso p("wearW") > 0 AndAlso Lb > 80 Then
            m.Add("wear", "Elegdliin tuuz", nw, twr, One(Sol(twr, Fr(A3(0, 0, 0), A3(0, 1, 0), A3(1, 0, 0)), Rc(0, 0, p("wearW"), Lb - 40, 0))))
            For k As Integer = 0 To nw - 1
                m.Place("wear", FrXY(R + 20, W * (k + 1) / (nw + 1) - p("wearW") / 2, 0))
            Next
        End If
        If p("cutter") > 0 AndAlso p("cutterW") > 0 Then
            Dim ux As Double = (Bx - D) / Lm, uz As Double = H / Lm
            m.Add("cut", "Khajuugiin ir", 2, ts, One(Sol(ts, FrXY(0, 0, 0), Rc(0, 0, Rnd0(Lm), p("cutterW"), 0))))
            m.Place("cut", FrRaw(A3(D, -ts, 0), A3(ux, 0, uz), A3(-uz, 0, ux), A3(0, -1, 0)))
            m.Place("cut", FrRaw(A3(Bx, W + ts, H), A3(-ux, 0, -uz), A3(-uz, 0, ux), A3(0, 1, 0)))
        End If
        Return m
    End Function
End Class
