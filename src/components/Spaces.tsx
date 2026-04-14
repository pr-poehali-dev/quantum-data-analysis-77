import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/1c130442-a7e7-41a3-9d14-99e89f85d99b";

interface Space {
  id: number;
  title: string;
  area: string;
  price: string;
  location: string;
  description: string;
  image_url: string | null;
  is_rented: boolean;
  renter_name: string | null;
  renter_contact: string | null;
  rent_start: string | null;
  rent_end: string | null;
  rent_notes: string | null;
}

interface AdminModalProps {
  space: Space;
  password: string;
  onClose: () => void;
  onSave: (updated: Space) => void;
}

function AdminModal({ space, password, onClose, onSave }: AdminModalProps) {
  const [tab, setTab] = useState<"info" | "rent">("info");
  const [infoForm, setInfoForm] = useState({
    title: space.title,
    area: space.area,
    price: space.price,
    location: space.location,
    description: space.description,
  });
  const [rentForm, setRentForm] = useState({
    renter_name: space.renter_name || "",
    renter_contact: space.renter_contact || "",
    rent_start: space.rent_start ? space.rent_start.slice(0, 10) : "",
    rent_end: space.rent_end ? space.rent_end.slice(0, 10) : "",
    rent_notes: space.rent_notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(space.image_url);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ id: space.id, image: base64 }),
      });
      const updated = await res.json();
      setPreview(updated.image_url);
      setPhotoLoading(false);
      onSave(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleInfoSave = async () => {
    setLoading(true);
    const res = await fetch(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Password": password },
      body: JSON.stringify({ id: space.id, ...infoForm }),
    });
    const updated = await res.json();
    setLoading(false);
    onSave(updated);
  };

  const handleRentSave = async (is_rented: boolean) => {
    setLoading(true);
    const body = is_rented ? { id: space.id, is_rented: true, ...rentForm } : { id: space.id, is_rented: false };
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Password": password },
      body: JSON.stringify(body),
    });
    const updated = await res.json();
    setLoading(false);
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md mx-4 p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-black" onClick={onClose}>
          <Icon name="X" size={20} />
        </button>

        {/* Фото */}
        <label className="block mb-4 cursor-pointer group">
          <div className="relative h-36 bg-neutral-100 overflow-hidden border border-neutral-200">
            {preview ? (
              <img src={preview} alt="фото" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 gap-2">
                <Icon name="ImagePlus" size={32} />
                <span className="text-xs uppercase tracking-wide">Добавить фото</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-white text-xs uppercase tracking-wide flex items-center gap-1">
                {photoLoading ? "Загружаю..." : <><Icon name="Upload" size={14} /> Загрузить фото</>}
              </span>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={photoLoading} />
        </label>

        {/* Вкладки */}
        <div className="flex border-b border-neutral-200 mb-4">
          {(["info", "rent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs uppercase tracking-wide transition-colors duration-150 ${
                tab === t ? "border-b-2 border-black text-black font-medium" : "text-neutral-400 hover:text-black"
              }`}
            >
              {t === "info" ? "Информация" : "Аренда"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="flex flex-col gap-3">
            <input
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
              placeholder="Название"
              value={infoForm.title}
              onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Площадь, м²"
                value={infoForm.area}
                onChange={(e) => setInfoForm({ ...infoForm, area: e.target.value })}
              />
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Цена, ₽/мес"
                value={infoForm.price}
                onChange={(e) => setInfoForm({ ...infoForm, price: e.target.value })}
              />
            </div>
            <input
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
              placeholder="Локация"
              value={infoForm.location}
              onChange={(e) => setInfoForm({ ...infoForm, location: e.target.value })}
            />
            <textarea
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black resize-none"
              rows={3}
              placeholder="Описание"
              value={infoForm.description}
              onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
            />
            <button
              className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors duration-200 disabled:opacity-50"
              onClick={handleInfoSave}
              disabled={loading}
            >
              {loading ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
        )}

        {tab === "rent" && (
          <div className="flex flex-col gap-3">
            {space.is_rented && (
              <button
                className="w-full border border-black px-4 py-2 text-sm uppercase tracking-wide hover:bg-black hover:text-white transition-colors duration-200"
                onClick={() => handleRentSave(false)}
                disabled={loading}
              >
                Освободить помещение
              </button>
            )}
            <input
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
              placeholder="Имя арендатора"
              value={rentForm.renter_name}
              onChange={(e) => setRentForm({ ...rentForm, renter_name: e.target.value })}
            />
            <input
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
              placeholder="Телефон / Email"
              value={rentForm.renter_contact}
              onChange={(e) => setRentForm({ ...rentForm, renter_contact: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                value={rentForm.rent_start}
                onChange={(e) => setRentForm({ ...rentForm, rent_start: e.target.value })}
              />
              <input
                type="date"
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                value={rentForm.rent_end}
                onChange={(e) => setRentForm({ ...rentForm, rent_end: e.target.value })}
              />
            </div>
            <textarea
              className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black resize-none"
              rows={3}
              placeholder="Примечания"
              value={rentForm.rent_notes}
              onChange={(e) => setRentForm({ ...rentForm, rent_notes: e.target.value })}
            />
            <button
              className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors duration-200 disabled:opacity-50"
              onClick={() => handleRentSave(true)}
              disabled={loading}
            >
              {loading ? "Сохраняю..." : "Отметить как арендовано"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PasswordModalProps {
  onEnter: (pwd: string) => void;
  onClose: () => void;
}

function PasswordModal({ onEnter, onClose }: PasswordModalProps) {
  const [pwd, setPwd] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-black" onClick={onClose}>
          <Icon name="X" size={20} />
        </button>
        <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Вход в управление</h2>
        <input
          type="password"
          className="border border-neutral-300 px-3 py-2 text-sm w-full mb-3 focus:outline-none focus:border-black"
          placeholder="Пароль"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter(pwd)}
        />
        <button
          className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide w-full hover:bg-neutral-800 transition-colors duration-200"
          onClick={() => onEnter(pwd)}
        >
          Войти
        </button>
      </div>
    </div>
  );
}

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => { setSpaces(data); setLoading(false); });
  }, []);

  const withAuth = (action: () => void) => {
    if (!adminPassword) {
      setPendingAction(() => action);
      setShowPasswordModal(true);
    } else {
      action();
    }
  };

  const handlePasswordEnter = (pwd: string) => {
    setAdminPassword(pwd);
    setShowPasswordModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleSave = (updated: Space) => {
    setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSpace(null);
  };

  const handleAdd = async (pwd: string) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Password": pwd },
      body: JSON.stringify({ title: "Новое помещение" }),
    });
    const created = await res.json();
    setSpaces((prev) => [...prev, created]);
    setEditingSpace(created);
  };

  const handleDelete = async (spaceId: number, pwd: string) => {
    setDeletingId(spaceId);
    await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-Admin-Password": pwd },
      body: JSON.stringify({ id: spaceId }),
    });
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
    setDeletingId(null);
  };

  return (
    <section id="spaces" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="uppercase text-sm tracking-wide text-neutral-500 mb-4">Доступные площади</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight">
              Помещения для аренды
            </h2>
          </div>
          <button
            onClick={() => withAuth(() => handleAdd(adminPassword!))}
            className="flex items-center gap-2 border border-black px-4 py-2 text-sm uppercase tracking-wide hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <Icon name="Plus" size={16} />
            Добавить помещение
          </button>
        </div>

        {loading ? (
          <div className="text-neutral-400 text-center py-20">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => (
              <div key={space.id} className="border border-neutral-200 flex flex-col">
                <div className="h-48 bg-neutral-100 overflow-hidden relative">
                  {space.image_url ? (
                    <img src={space.image_url} alt={space.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Icon name="Store" size={48} />
                    </div>
                  )}
                  <button
                    onClick={() => withAuth(() => handleDelete(space.id, adminPassword!))}
                    disabled={deletingId === space.id}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 hover:text-red-600 text-neutral-400 p-1.5 transition-colors duration-150"
                    title="Удалить помещение"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-neutral-900 text-lg leading-tight">{space.title}</h3>
                    <span
                      className={`ml-2 shrink-0 text-xs uppercase px-2 py-1 font-medium tracking-wide ${
                        space.is_rented
                          ? "bg-neutral-900 text-white"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {space.is_rented ? "Арендовано" : "Свободно"}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mb-1 flex items-center gap-1">
                    <Icon name="MapPin" size={12} />
                    {space.location}
                  </p>
                  <p className="text-sm text-neutral-500 mb-3 flex items-center gap-1">
                    <Icon name="Maximize2" size={12} />
                    {space.area} м² · {Number(space.price).toLocaleString("ru-RU")} ₽/мес
                  </p>
                  <p className="text-sm text-neutral-600 mb-4 flex-1">{space.description}</p>

                  {space.is_rented && space.renter_name && (
                    <p className="text-xs text-neutral-400 mb-3">
                      Арендатор: {space.renter_name}
                    </p>
                  )}

                  <button
                    onClick={() => withAuth(() => setEditingSpace(space))}
                    className={`mt-auto w-full py-2 text-sm uppercase tracking-wide border transition-colors duration-200 cursor-pointer ${
                      space.is_rented
                        ? "border-neutral-300 text-neutral-500 hover:border-black hover:text-black"
                        : "bg-black text-white border-black hover:bg-white hover:text-black"
                    }`}
                  >
                    {space.is_rented ? "Изменить аренду" : "Отметить как занято"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPasswordModal && (
        <PasswordModal onEnter={handlePasswordEnter} onClose={() => { setShowPasswordModal(false); setPendingAction(null); }} />
      )}
      {editingSpace && adminPassword && (
        <AdminModal
          space={editingSpace}
          password={adminPassword}
          onClose={() => setEditingSpace(null)}
          onSave={handleSave}
        />
      )}
    </section>
  );
}